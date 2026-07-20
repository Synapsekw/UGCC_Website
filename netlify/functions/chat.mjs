// UGCC chatbot proxy. Dependency-free (native fetch) so nothing is bundled or
// published. Deterministic retrieval: Arabic queries are translated to English
// keywords, the vector store is searched directly (not via the model), and the
// answer is generated grounded in the retrieved excerpts, in the user's language.

export const MAX_LEN = 1000;
const MAX_HISTORY = 12;
const MODEL = "gpt-4o-mini";
const OPENAI = "https://api.openai.com/v1";

const SYSTEM_PROMPT = `You are the assistant for United Gulf Construction Company (UGCC), a construction company in Kuwait.
Answer ONLY using the "Knowledge base excerpts" provided in the user's message (about UGCC's projects, business lines, facilities, equipment, HSSE, quality, CSR, careers, and contact details).
Reply in the user's language: Arabic for Arabic questions, otherwise English.
If the excerpts do not contain the answer, say you don't have that information and suggest visiting the contact page. Be concise and professional. Never invent projects, numbers, or contacts.
Write clean prose. Do NOT include citation markers, source numbers, footnotes, or bracketed references such as "(15)" or "【...】".
Excerpts may start with a marker like "[Source page: /some-page/]". When one or more of those pages are directly relevant to your answer (e.g. the project or topic the user asked about), add ONE final line in exactly this format:
LINKS: /path/ | Page title; /other-path/ | Other title
Use only paths that appear in the excerpts' Source page markers, at most 3, with a short human-friendly title in the user's language. If no page is clearly relevant, omit the line entirely. Never mention or explain the LINKS line in your prose — it is rendered separately as buttons.`;

export function validate(body) {
  const message = (body?.message ?? "").toString().trim();
  if (!message) return { ok: false, error: "Empty message." };
  if (message.length > MAX_LEN) return { ok: false, error: "Message too long." };
  let history = Array.isArray(body?.history) ? body.history : [];
  history = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY);
  return { ok: true, message, history };
}

// Lightweight per-instance throttle: caps requests per sessionId in a short
// window. Serverless instances are ephemeral, so this only bounds a single hot
// instance — the PRIMARY spend guardrail is the OpenAI monthly usage limit the
// owner sets on the key. A cross-instance limit (Netlify Blobs) is a follow-up.
const _hits = new Map(); // key -> number[] (timestamps ms)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;
export function rateLimited(key, now = Date.now()) {
  const arr = (_hits.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  _hits.set(key, arr);
  return arr.length > RATE_MAX;
}

// Remove citation artifacts the model sometimes leaks into prose:
// OpenAI's 【..†source】 markers and markdown links whose target is a bare index.
export function cleanText(text) {
  return text
    .replace(/【[^】]*】/g, "")
    .replace(/\[([^\]]+)\]\(\s*\d+\s*\)/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

// Pull the assistant text out of an OpenAI Responses API payload.
export function extractText(data) {
  const parts = [];
  for (const item of data?.output || []) {
    if (item.type === "message") {
      for (const c of item.content || []) {
        if (c.type === "output_text" && c.text) parts.push(c.text);
      }
    }
  }
  return cleanText(parts.join("\n"));
}

// Corpus filenames mirror the site's directory slugs (see tools/knowledge/build.py):
// "ra-200.txt" -> /ra-200/, "home.txt" -> /. Non-page sources (the company profile
// PDF) and anything not shaped like a slug map to null.
export function pagePathForFilename(filename) {
  const m = /^([a-z0-9][a-z0-9-]*)\.txt$/i.exec(filename || "");
  if (!m) return null;
  const slug = m[1].toLowerCase();
  if (slug === "company-profile") return null;
  return slug === "home" ? "/" : `/${slug}/`;
}

// Concatenate vector-store search results into a grounded context string.
// Each excerpt is tagged with the site page it came from so the model can offer
// links, and the set of those page paths is returned as the link whitelist.
export function formatSearchResults(data) {
  const chunks = [];
  const paths = [];
  for (const item of data?.data || []) {
    const text = (item.content || []).map((c) => c?.text).filter(Boolean).join(" ").trim();
    if (!text) continue;
    const path = pagePathForFilename(item.filename);
    if (path) {
      chunks.push(`[Source page: ${path}]\n${text}`);
      if (!paths.includes(path)) paths.push(path);
    } else {
      chunks.push(text);
    }
  }
  return { context: chunks.join("\n\n---\n\n").slice(0, 12000), paths };
}

// Pull the trailing "LINKS: /path/ | Title; ..." line out of the model's answer.
// Only paths retrieved this turn survive, so the bot can never link to a page
// it did not actually read about (no hallucinated URLs).
export function extractLinks(text, allowedPaths) {
  const m = /^\s*LINKS:\s*(.+)\s*$/m.exec(text);
  if (!m) return { output: text.trim(), links: [] };
  const output = text.replace(m[0], "").trim();
  const allowed = new Set(allowedPaths || []);
  const links = [];
  for (const part of m[1].split(";")) {
    const [rawPath, ...titleParts] = part.split("|");
    if (!rawPath) continue;
    let url = rawPath.trim();
    if (url !== "/" && !url.endsWith("/")) url += "/";
    if (!/^\/[a-z0-9-]*\/?$/i.test(url)) continue;
    if (!allowed.has(url)) continue;
    if (links.some((l) => l.url === url)) continue;
    const title = titleParts.join("|").trim() || url;
    links.push({ url, title });
    if (links.length === 3) break;
  }
  return { output, links };
}

// Arabic -> concise English search keywords (best-effort; null on error).
async function englishSearchTerms(apiKey, text) {
  try {
    const r = await fetch(`${OPENAI}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        input: `Translate this into short English search keywords for a construction-company knowledge base. Reply with ONLY the English keywords, nothing else:\n\n${text}`,
      }),
    });
    if (!r.ok) return null;
    return extractText(await r.json()) || null;
  } catch {
    return null;
  }
}

// Deterministic retrieval straight from the vector store (model does not choose
// the query), so English and Arabic both search with a strong English query.
async function retrieveContext(apiKey, vsId, query) {
  try {
    const r = await fetch(`${OPENAI}/vector_stores/${vsId}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, max_num_results: 8 }),
    });
    if (!r.ok) return { context: "", paths: [] };
    return formatSearchResults(await r.json());
  } catch {
    return { context: "", paths: [] };
  }
}

const ALLOWED_ORIGINS = [
  /\.netlify\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
  // add the Hostinger production domain here at go-live, e.g. /^https:\/\/(www\.)?ugcc\.com$/
];

function corsHeaders(origin) {
  const allow = origin && ALLOWED_ORIGINS.some((re) => re.test(origin));
  return {
    "Access-Control-Allow-Origin": allow ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export default async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Bad JSON" }), { status: 400, headers });
  }

  const v = validate(body);
  if (!v.ok) return new Response(JSON.stringify({ error: v.error }), { status: 400, headers });

  const rlKey = (body?.sessionId || req.headers.get("x-forwarded-for") || "anon").toString();
  if (rateLimited(rlKey))
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), { status: 429, headers });

  const apiKey = process.env.OPENAI_API_KEY;
  const vsId = process.env.OPENAI_VECTOR_STORE_ID;
  if (!apiKey || !vsId)
    return new Response(JSON.stringify({ error: "Server not configured." }), { status: 500, headers });

  try {
    // Search in English regardless of the question's language.
    let query = v.message;
    if (/[\u0600-\u06FF]/.test(v.message)) {
      const en = await englishSearchTerms(apiKey, v.message);
      if (en) query = en;
    }
    const { context, paths } = await retrieveContext(apiKey, vsId, query);

    const input = [
      { role: "system", content: SYSTEM_PROMPT },
      ...v.history,
      { role: "user", content: `Knowledge base excerpts:\n${context || "(no relevant excerpts found)"}\n\n---\nQuestion: ${v.message}` },
    ];
    const r = await fetch(`${OPENAI}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: "Upstream error." }), { status: 502, headers });
    const data = await r.json();
    const { output, links } = extractLinks(extractText(data), paths);
    return new Response(JSON.stringify({ output: output || "Sorry, I couldn't produce an answer.", links }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Upstream error." }), { status: 502, headers });
  }
};
