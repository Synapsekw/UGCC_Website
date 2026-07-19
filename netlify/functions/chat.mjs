// UGCC chatbot proxy. Dependency-free (native fetch) so nothing is bundled or
// published. Holds the OpenAI key server-side and calls the Responses API with
// file_search over the UGCC knowledge vector store.

export const MAX_LEN = 1000;
const MAX_HISTORY = 12;
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are the assistant for United Gulf Construction Company (UGCC), a construction company in Kuwait.
Answer ONLY using the provided knowledge (file search results about UGCC's projects, business lines, facilities, equipment, HSSE, quality, CSR, careers, and contact details).
The knowledge base is written in English. ALWAYS query the knowledge base with English search terms, even when the user writes in Arabic — translate their question into English keywords to search, then write your reply in the user's language (Arabic for Arabic questions, otherwise English).
If the answer is not in the knowledge, say you don't have that information and suggest visiting the contact page. Be concise and professional. Never invent projects, numbers, or contacts.
Write clean prose. Do NOT include citation markers, source numbers, footnotes, or bracketed references such as "(15)" or "【...】" in your answer.`;

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

// Remove file_search citation artifacts the model sometimes leaks into prose:
// OpenAI's 【..†source】 markers and markdown links whose target is a bare
// source index like [text](15).
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
    const input = [
      { role: "system", content: SYSTEM_PROMPT },
      ...v.history,
      { role: "user", content: v.message },
    ];
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        input,
        tools: [{ type: "file_search", vector_store_ids: [vsId], max_num_results: 10 }],
      }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: "Upstream error." }), { status: 502, headers });
    const data = await r.json();
    const output = extractText(data) || "Sorry, I couldn't produce an answer.";
    return new Response(JSON.stringify({ output }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Upstream error." }), { status: 502, headers });
  }
};
