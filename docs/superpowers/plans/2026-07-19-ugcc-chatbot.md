# UGCC AI Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a bilingual (Arabic + English) knowledge Q&A chatbot on the UGCC site: an inlined widget → a Netlify Function (holds the OpenAI key) → OpenAI Responses API with file_search over an OpenAI-hosted vector store built from the 67 site pages + the Company Profile PDF.

**Architecture:** The static site's widget POSTs to a same-origin Netlify Function. The function is a thin secure proxy: it holds `OPENAI_API_KEY`, applies guardrails, and calls OpenAI's Responses API with the `file_search` tool bound to a vector store (`OPENAI_VECTOR_STORE_ID`). Knowledge is built offline by a Python script that extracts clean text from the pages + PDF and uploads it to the vector store.

**Tech Stack:** Node 20 (Netlify Function, `openai` npm SDK), Python 3 (`beautifulsoup4`, `pypdf`, `openai` for the build script), plain JS + Shadow DOM (widget), `netlify.toml`.

## Global Constraints

- **Branch:** all work lands on `master` (the deployed/previewed branch). Do NOT switch the main working tree — it is on `v3.0` (an active parallel session). Work in an isolated worktree created via superpowers:using-git-worktrees. On Windows, use a SHORT worktree base path (e.g. `C:/Users/D/ugcc-wt`) to avoid the 260-char MAX_PATH limit that fails full checkouts under the deep scratchpad path.
- **Secret handling:** the OpenAI key is NEVER committed, echoed, printed, or placed in any client asset. It is read from the environment (`OPENAI_API_KEY`) at build time and set as a Netlify env var at runtime. The site owner provisions it; Claude must not type or print it.
- **Namespacing (avoid v3.0 collisions):** chatbot code lives in `assets/js/chat-widget.js`, `netlify/functions/`, and `tools/knowledge/` only.
- **Widget brand:** primary color `#d31225`, title "UGCC Support" (existing), Shadow-DOM isolation preserved.
- **Model:** `gpt-4o-mini` (constant, easily swappable).
- **Vector store name:** `UGCC Knowledge`.
- **Cache-buster:** the widget `<script>` include uses `?v=N`, matching the site convention; bump N when `chat-widget.js` changes.
- **Message protocol:** widget → function POST body `{ message: string, sessionId: string, history: {role,content}[] }`; function → `{ output: string }` (200) or `{ error: string }` (4xx/5xx).

---

## File Structure

- Create `tools/knowledge/requirements.txt` — Python deps.
- Create `tools/knowledge/extract.py` — pure functions: `extract_page_text(html)`, `extract_pdf_text(path)`.
- Create `tools/knowledge/test_extract.py` — unit tests for extraction.
- Create `tools/knowledge/build.py` — CLI: build corpus from site + PDF, upload to OpenAI vector store.
- Create `tools/knowledge/corpus/` — generated clean text (committed).
- Create `netlify/functions/chat.js` — the serverless function.
- Create `netlify/functions/chat.test.mjs` — unit tests (mocked OpenAI).
- Create `package.json` — declares the `openai` dependency for the function.
- Modify `netlify.toml` — add `[functions]` dir + `/api/chat` redirect (file already exists with `[build]`/`[[headers]]`).
- Create `assets/js/chat-widget.js` — inlined, self-initializing widget.
- Modify root `index.html` + 67 `*/index.html` — swap the external widget include for the local one.
- Create `.gitignore` entry for `.env` / `.netlify/` (extend existing `.gitignore`).

---

## Task 1: Knowledge extraction library (Python, pure functions)

**Files:**
- Create: `tools/knowledge/requirements.txt`
- Create: `tools/knowledge/extract.py`
- Test: `tools/knowledge/test_extract.py`

**Interfaces:**
- Produces:
  - `extract_page_text(html: str) -> str` — returns the page's main visible text with the repeated site chrome (header/nav/footer/scripts/styles/noscript) removed, whitespace-collapsed.
  - `extract_pdf_text(path: str) -> str` — returns the PDF's text content.

- [ ] **Step 1: Write requirements.txt**

```
beautifulsoup4==4.12.3
pypdf==5.1.0
openai>=1.50.0
```

- [ ] **Step 2: Write the failing tests**

```python
# tools/knowledge/test_extract.py
from extract import extract_page_text

SAMPLE = """
<html><head><style>.x{color:red}</style><script>var a=1</script></head>
<body>
  <header class="header"><nav><a href="/">Home</a><a href="/careers">Careers</a></nav></header>
  <main>
    <h1>Duqm Commercial Berth</h1>
    <p>UGCC delivered infrastructure works for the commercial berth at Duqm Port, Oman.</p>
  </main>
  <footer class="footer">© UGCC. Kuwait. All rights reserved.</footer>
</body></html>
"""

def test_extracts_main_content():
    out = extract_page_text(SAMPLE)
    assert "Duqm Commercial Berth" in out
    assert "commercial berth at Duqm Port" in out

def test_strips_chrome_and_code():
    out = extract_page_text(SAMPLE)
    assert "Home" not in out           # nav stripped
    assert "All rights reserved" not in out  # footer stripped
    assert "var a=1" not in out        # script stripped
    assert "color:red" not in out      # style stripped

def test_collapses_whitespace():
    out = extract_page_text("<main>  a\n\n   b   </main>")
    assert "a b" in out
    assert "\n\n" not in out
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd tools/knowledge && python -m pytest test_extract.py -v`
Expected: FAIL (ModuleNotFoundError: extract / function not defined). Install deps first if needed: `python -m pip install -r requirements.txt`.

- [ ] **Step 4: Implement extract.py**

```python
# tools/knowledge/extract.py
import re
from bs4 import BeautifulSoup
from pypdf import PdfReader

# Site chrome that repeats on every page and must not pollute the knowledge base.
_CHROME_SELECTORS = ["script", "style", "noscript", "header", "footer", "nav"]

def extract_page_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for sel in _CHROME_SELECTORS:
        for el in soup.select(sel):
            el.decompose()
    # Prefer <main>; fall back to <body>.
    root = soup.find("main") or soup.body or soup
    text = root.get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()

def extract_pdf_text(path: str) -> str:
    reader = PdfReader(path)
    parts = [(page.extract_text() or "") for page in reader.pages]
    text = "\n".join(parts)
    return re.sub(r"[ \t]+", " ", text).strip()
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd tools/knowledge && python -m pytest test_extract.py -v`
Expected: PASS (3 passed).

- [ ] **Step 6: Commit**

```bash
git add tools/knowledge/requirements.txt tools/knowledge/extract.py tools/knowledge/test_extract.py
git commit -m "chatbot: knowledge extraction library (HTML main-content + PDF)"
```

---

## Task 2: Knowledge build CLI (corpus + vector-store upload)

**Files:**
- Create: `tools/knowledge/build.py`
- Create: `tools/knowledge/corpus/.gitkeep`
- Modify: `.gitignore` (add `.env`)

**Interfaces:**
- Consumes: `extract_page_text`, `extract_pdf_text` (Task 1).
- Produces: CLI `python build.py --corpus-only` writes `corpus/*.txt`; `python build.py --upload` creates/updates the `UGCC Knowledge` vector store and prints its id.

- [ ] **Step 1: Write build.py (corpus generation + upload), run from repo root**

```python
# tools/knowledge/build.py
import argparse, glob, os, sys, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from extract import extract_page_text, extract_pdf_text

REPO = Path(__file__).resolve().parents[2]
CORPUS = Path(__file__).parent / "corpus"
PDF_GLOB = "assets/img/*company_profile*.pdf"

def slug_for(page_dir: Path) -> str:
    rel = page_dir.relative_to(REPO)
    return "home" if str(rel) == "." else str(rel).replace(os.sep, "-")

def build_corpus() -> list[Path]:
    CORPUS.mkdir(exist_ok=True)
    for old in CORPUS.glob("*.txt"):
        old.unlink()
    written = []
    for html_path in REPO.glob("**/index.html"):
        # skip anything under dot-dirs / node_modules
        if any(part.startswith(".") for part in html_path.parts): continue
        text = extract_page_text(html_path.read_text(encoding="utf-8", errors="ignore"))
        if len(text) < 40:  # skip near-empty
            continue
        out = CORPUS / (slug_for(html_path.parent) + ".txt")
        out.write_text(f"Source page: /{slug_for(html_path.parent)}/\n\n{text}\n", encoding="utf-8")
        written.append(out)
    # PDF
    pdfs = list(REPO.glob(PDF_GLOB))
    if pdfs:
        ptext = extract_pdf_text(str(pdfs[0]))
        (CORPUS / "company-profile.txt").write_text(
            f"Source: UGCC Company Profile PDF\n\n{ptext}\n", encoding="utf-8")
        written.append(CORPUS / "company-profile.txt")
    return written

def upload(vector_store_id: str | None):
    from openai import OpenAI
    client = OpenAI()  # reads OPENAI_API_KEY from env; never printed
    if vector_store_id:
        vs_id = vector_store_id
    else:
        vs = client.vector_stores.create(name="UGCC Knowledge")
        vs_id = vs.id
    files = sorted(CORPUS.glob("*.txt"))
    streams = [open(f, "rb") for f in files]
    try:
        client.vector_stores.file_batches.upload_and_poll(
            vector_store_id=vs_id, files=streams)
    finally:
        for s in streams: s.close()
    print(f"VECTOR_STORE_ID={vs_id}")
    print(f"Uploaded {len(files)} files.")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus-only", action="store_true")
    ap.add_argument("--upload", action="store_true")
    ap.add_argument("--vector-store-id", default=os.environ.get("OPENAI_VECTOR_STORE_ID"))
    a = ap.parse_args()
    written = build_corpus()
    print(f"Wrote {len(written)} corpus files to {CORPUS}")
    if a.upload:
        upload(a.vector_store_id)
```

- [ ] **Step 2: Verify the OpenAI SDK surface before relying on it**

Run: `python -c "import openai; c=openai.OpenAI; print([m for m in dir(openai.OpenAI()) if 'vector' in m.lower()])"` (needs `OPENAI_API_KEY` in env).
Expected: shows `vector_stores`. If the installed SDK exposes it under `.beta` instead, change `client.vector_stores` → `client.beta.vector_stores` in build.py. Fix and note.

- [ ] **Step 3: Generate the corpus (no key needed) and eyeball it**

Run: `cd "$REPO" && python tools/knowledge/build.py --corpus-only`
Expected: "Wrote ~60+ corpus files". Open two or three `tools/knowledge/corpus/*.txt` and confirm they contain real page content and NO nav/footer boilerplate.

- [ ] **Step 4: Add `.env` to .gitignore**

Append to `.gitignore`:
```
.env
.netlify/
```

- [ ] **Step 5: Commit the script + generated corpus**

```bash
git add tools/knowledge/build.py tools/knowledge/corpus/ .gitignore
git commit -m "chatbot: knowledge build CLI + generated corpus"
```

- [ ] **Step 6: (Owner-run, live) create the vector store**

Run with the key in env (owner or Claude via pre-set env; key never printed):
`OPENAI_API_KEY=... python tools/knowledge/build.py --upload`
Expected: prints `VECTOR_STORE_ID=vs_...`. Record this id — it becomes the Netlify env var `OPENAI_VECTOR_STORE_ID`. (Do not commit it in code.)

---

## Task 3: Netlify Function (secure OpenAI proxy)

**Files:**
- Create: `netlify/functions/chat.js`
- Create: `package.json`
- Create: `netlify/functions/chat.test.mjs`
- Modify: `netlify.toml`

**Interfaces:**
- Consumes: env `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`; POST `{message, sessionId, history}`.
- Produces: HTTP handler returning `{output}` (200) or `{error}` (4xx/5xx). Pure helper `validate(body) -> {ok, error?}` exported for testing.

- [ ] **Step 1: Write package.json**

```json
{
  "name": "ugcc-site-functions",
  "private": true,
  "type": "module",
  "dependencies": { "openai": "^4.68.0" },
  "devDependencies": { "vitest": "^2.1.0" },
  "scripts": { "test": "vitest run" }
}
```

- [ ] **Step 2: Write failing validation tests**

```javascript
// netlify/functions/chat.test.mjs
import { describe, it, expect } from "vitest";
import { validate, MAX_LEN, rateLimited } from "./chat.js";

describe("rateLimited", () => {
  it("trips after RATE_MAX requests in the window", () => {
    const key = "sess-" + Math.random();
    let tripped = false;
    for (let i = 0; i < 15; i++) tripped = rateLimited(key, 1000 + i);
    expect(tripped).toBe(true);
  });
  it("does not trip for a fresh key", () => {
    expect(rateLimited("fresh-" + Math.random())).toBe(false);
  });
});

describe("validate", () => {
  it("rejects empty message", () => {
    expect(validate({ message: "" }).ok).toBe(false);
  });
  it("rejects over-length message", () => {
    expect(validate({ message: "x".repeat(MAX_LEN + 1) }).ok).toBe(false);
  });
  it("accepts a normal message", () => {
    expect(validate({ message: "What has UGCC built in Oman?" }).ok).toBe(true);
  });
  it("caps history length", () => {
    const history = Array.from({ length: 50 }, () => ({ role: "user", content: "hi" }));
    const r = validate({ message: "hi", history });
    expect(r.ok).toBe(true);
    expect(r.history.length).toBeLessThanOrEqual(12);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm install && npx vitest run netlify/functions/chat.test.mjs`
Expected: FAIL (cannot import `validate`).

- [ ] **Step 4: Implement chat.js**

```javascript
// netlify/functions/chat.js
import OpenAI from "openai";

export const MAX_LEN = 1000;
const MAX_HISTORY = 12;
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are the assistant for United Gulf Construction Company (UGCC), a construction company in Kuwait.
Answer ONLY using the provided knowledge (file search results about UGCC's projects, business lines, facilities, equipment, HSSE, quality, CSR, careers, and contact details).
Reply in the user's language: if they write in Arabic, answer in Arabic; otherwise answer in English.
If the answer is not in the knowledge, say you don't have that information and suggest the contact page. Be concise and professional. Never invent projects, numbers, or contacts.`;

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
// owner sets on the key (see Task 6). A cross-instance limit (Netlify Blobs) is
// a documented follow-up if abuse appears.
const _hits = new Map(); // key -> number[] (timestamps ms)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;
export function rateLimited(key, now = Date.now()) {
  const arr = (_hits.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  _hits.set(key, arr);
  return arr.length > RATE_MAX;
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
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Bad JSON" }), { status: 400, headers }); }

  const v = validate(body);
  if (!v.ok) return new Response(JSON.stringify({ error: v.error }), { status: 400, headers });

  const rlKey = (body?.sessionId || req.headers.get("x-forwarded-for") || "anon").toString();
  if (rateLimited(rlKey))
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), { status: 429, headers });

  const vsId = process.env.OPENAI_VECTOR_STORE_ID;
  if (!process.env.OPENAI_API_KEY || !vsId)
    return new Response(JSON.stringify({ error: "Server not configured." }), { status: 500, headers });

  try {
    const client = new OpenAI();
    const input = [
      { role: "system", content: SYSTEM_PROMPT },
      ...v.history,
      { role: "user", content: v.message },
    ];
    const resp = await client.responses.create({
      model: MODEL,
      input,
      tools: [{ type: "file_search", vector_store_ids: [vsId] }],
    });
    const output = resp.output_text || "Sorry, I couldn't produce an answer.";
    return new Response(JSON.stringify({ output }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Upstream error." }), { status: 502, headers });
  }
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run netlify/functions/chat.test.mjs`
Expected: PASS (4 passed).

- [ ] **Step 6: Add function config + redirect to netlify.toml**

Append to `netlify.toml`:
```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/chat"
  to = "/.netlify/functions/chat"
  status = 200
```

- [ ] **Step 7: Verify the OpenAI Responses/file_search surface**

Run: `node -e "import('openai').then(({default:O})=>{const c=new O({apiKey:'test'}); console.log(typeof c.responses?.create)})"`
Expected: `function`. If `responses` is undefined in the installed SDK, upgrade `openai` in package.json to a version that has the Responses API (>=4.60) and re-run.

- [ ] **Step 8: Commit**

```bash
git add netlify/functions/chat.js netlify/functions/chat.test.mjs package.json netlify.toml
git commit -m "chatbot: Netlify function proxy to OpenAI Responses + file_search"
```

---

## Task 4: Inlined widget (`assets/js/chat-widget.js`)

**Files:**
- Create: `assets/js/chat-widget.js`

**Interfaces:**
- Consumes: `POST /api/chat` (Task 3).
- Produces: a self-initializing widget (no per-page init needed). On DOMContentLoaded it instantiates the chat UI with baked-in config and endpoint `/api/chat`.

- [ ] **Step 1: Base the file on the existing widget, with these exact changes**

Fetch the current widget as the starting point:
`curl -s "https://synapsekw.github.io/ugcc_widget/widget.js?v=6" -o assets/js/chat-widget.js`

Then modify `assets/js/chat-widget.js`:
1. Keep the `GlassChatWidget` class and its Shadow-DOM styles/markup unchanged.
2. In the send handler, change the POST body to include history and read `{output}`:

```javascript
// inside the click/send handler, replacing the existing fetch body
this._history = this._history || [];
this._history.push({ role: "user", content: text });
const response = await fetch(this.webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: text,
    sessionId: this.sessionId,
    history: this._history.slice(-6),
  }),
});
const data = await response.json();
const botReply = data.output || data.error || "Sorry, something went wrong.";
this._history.push({ role: "assistant", content: botReply });
```

3. Append a self-initializer at the end of the file (replaces the per-page init block):

```javascript
document.addEventListener("DOMContentLoaded", function () {
  if (window.__ugccChatLoaded) return;
  window.__ugccChatLoaded = true;
  new GlassChatWidget({
    webhookUrl: "/api/chat",
    chatTitle: "UGCC Assistant",
    primaryColor: "#d31225",
    welcomeMessage: "Hello! Ask me anything about UGCC. / مرحباً! اسألني أي شيء عن الشركة.",
  });
});
```

4. If the widget references a remote logo URL (`synapsekw.github.io/.../UGCC_White shield.png`), either self-host that image under `assets/img/v2/` and point to it, or drop the `logoUrl` config. Do not leave a github.io dependency.

- [ ] **Step 2: Verify no external dependencies remain in the file**

Run: `grep -n "github.io\|n8n.cloud\|http" assets/js/chat-widget.js`
Expected: no `github.io` or `n8n.cloud`; the only `/api/chat` endpoint is relative. Any remaining absolute URL must be an intentional self-hosted asset. Fix otherwise.

- [ ] **Step 3: Commit**

```bash
git add assets/js/chat-widget.js
git commit -m "chatbot: inline self-initializing widget pointing at /api/chat"
```

---

## Task 5: Swap the widget include on all pages

**Files:**
- Modify: root `index.html` + every `*/index.html` (68 files total).

**Interfaces:**
- Consumes: `assets/js/chat-widget.js` (Task 4).

- [ ] **Step 1: Write a Python replacer (removes external script + n8n init, adds local script)**

Because the existing markup is one external `<script src="…github.io…">` immediately followed by an inline `<script>…new GlassChatWidget({webhookUrl:'…n8n…'})…</script>`, replace both with a single local include. Save as `tools/knowledge/swap_widget.py` (temporary helper; delete after):

```python
import re, glob
NEW = '<script src="/assets/js/chat-widget.js?v=1" defer></script>'
pat = re.compile(
  r'<script[^>]*synapsekw\.github\.io/ugcc_widget[^>]*>\s*</script>'
  r'\s*<script>.*?</script>', re.DOTALL)
count = 0
for f in glob.glob("**/index.html", recursive=True):
    if any(p.startswith(".") for p in f.split("/")): continue
    s = open(f, encoding="utf-8").read()
    if "synapsekw.github.io/ugcc_widget" not in s: continue
    s2, n = pat.subn(NEW, s, count=1)
    if n:
        open(f, "w", encoding="utf-8").write(s2)
        count += 1
print(f"Updated {count} pages")
```

- [ ] **Step 2: Run it and verify**

Run: `cd "$REPO" && python tools/knowledge/swap_widget.py`
Expected: "Updated 68 pages" (or however many contain the widget).

Run: `grep -rl "synapsekw.github.io/ugcc_widget" --include=index.html . | wc -l`
Expected: `0`.

Run: `grep -rl "assets/js/chat-widget.js" --include=index.html . | wc -l`
Expected: matches the number updated (e.g. 68).

If the regex misses a variant (count < expected), inspect one missed page's widget block, adjust `pat`, re-run. Do NOT hand-guess — verify counts.

- [ ] **Step 3: Delete the temporary helper and commit**

```bash
rm tools/knowledge/swap_widget.py
git add -A
git commit -m "chatbot: point all pages at the inlined widget, drop github.io + n8n"
```

---

## Task 6: End-to-end verification (local + live) and security check

**Files:** none (verification only).

- [ ] **Step 1: Run the function locally with Netlify CLI**

Run (owner sets the two env vars first; key never printed):
```bash
npm install -g netlify-cli   # if not present
OPENAI_API_KEY=... OPENAI_VECTOR_STORE_ID=vs_... netlify dev
```
Expected: dev server on a local port serving the site + function.

- [ ] **Step 2: Smoke-test the function directly**

Run:
```bash
curl -s http://localhost:8888/api/chat -H "Content-Type: application/json" \
  -d '{"message":"What has UGCC built in Oman?","sessionId":"t1","history":[]}'
```
Expected: JSON `{"output":"…"}` mentioning the Duqm commercial berth / IP3 Oman project (grounded in knowledge).

- [ ] **Step 3: Browser E2E via the preview tools**

Open the local `netlify dev` URL, open the widget, and:
- Ask an English question grounded in the site → grounded answer.
- Ask the same in Arabic → Arabic answer.
- Ask something off-topic/unknown → graceful "I don't have that" + contact suggestion.
Capture a screenshot.

- [ ] **Step 4: Guardrail checks**

- Over-length: `curl` with a >1000-char message → HTTP 400 `{"error":"Message too long."}`.
- Method: `curl -X GET http://localhost:8888/api/chat` → 405.

- [ ] **Step 5: Secret-leak check on the built client**

Run: `grep -rn "sk-\|OPENAI_API_KEY" assets/ index.html */index.html netlify.toml || echo "clean"`
Expected: `clean` (the key appears nowhere in client assets or committed config).

- [ ] **Step 6 (owner): set an OpenAI monthly usage limit — the primary spend guardrail**

In the OpenAI dashboard → Settings → Limits, set a monthly budget/usage cap on the account (or a dedicated project key). This is the real backstop against runaway cost; the function's in-memory throttle only bounds a single hot instance.

- [ ] **Step 7: Deploy + live verify**

Push `master`; in Netlify set env vars `OPENAI_API_KEY` and `OPENAI_VECTOR_STORE_ID` (owner), trigger deploy. Then load the live preview URL, ask the same EN + AR questions, confirm grounded answers. Hard-refresh to bypass cached old widget.

- [ ] **Step 8: Final commit (docs/notes if any)**

```bash
git add -A && git commit -m "chatbot: verified end-to-end on live preview" --allow-empty
```

---

## Post-implementation notes
- **Refreshing knowledge:** after site content changes, re-run `python tools/knowledge/build.py --upload --vector-store-id vs_...` to update the same vector store; no code change needed.
- **Hostinger go-live:** add the production domain to `ALLOWED_ORIGINS` in `chat.js`, and keep calling the Netlify function via its absolute URL — OR port the function to a Hostinger PHP endpoint (separate small task).
- **v3.0:** if `v3.0` becomes the live site, carry `assets/js/chat-widget.js`, `netlify/functions/`, the `netlify.toml` additions, and `tools/knowledge/` into it, and re-run the page-swap for v3's pages.
