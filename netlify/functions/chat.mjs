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
Write clean prose. Do NOT include citation markers, source numbers, footnotes, or bracketed references such as "(15)" or "【...】".`;

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

// Concatenate vector-store search results into a grounded context string.
export function formatSearchResults(data) {
  const chunks = [];
  for (const item of data?.data || []) {
    const text = (item.content || []).map((c) => c?.text).filter(Boolean).join(" ").trim();
    if (text) chunks.push(text);
  }
  return chunks.join("\n\n---\n\n").slice(0, 12000);
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
    if (!r.ok) return { status: r.status, text: null };
    return { status: 200, text: extractText(await r.json()) || null };
  } catch (e) {
    return { status: "throw:" + (e?.message || "err"), text: null };
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
    if (!r.ok) return "";
    return formatSearchResults(await r.json());
  } catch {
    return "";
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
    let tr = { status: "skip", text: null };
    if (/[\u0600-\u06FF]/.test(v.message)) {
      tr = await englishSearchTerms(apiKey, v.message);
      if (tr.text) query = tr.text;
    }
    const context = await retrieveContext(apiKey, vsId, query);

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
    const output = extractText(data) || "Sorry, I couldn't produce an answer.";
    const payload = body?.debug === true
      ? { output, _debug: { query, translate: tr, contextChars: context.length } }
      : { output };
    return new Response(JSON.stringify(payload), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Upstream error." }), { status: 502, headers });
  }
};
