# UGCC AI Chatbot — Design Spec

**Date:** 2026-07-19
**Branch:** `master` (the deployed/previewed site)
**Status:** Approved design, pending implementation plan

## 1. Goal

A bilingual (Arabic + English) knowledge Q&A chatbot on the UGCC website that answers
questions about the company — projects, business lines, facilities, equipment, HSSE /
quality / CSR, careers, and contact details — grounded in the website's own content plus
the UGCC Company Profile PDF. No lead capture, no human handoff (out of scope).

## 2. Constraints

- The site is **static** (Netlify preview now, Hostinger at go-live). There is no
  application server bundled with the HTML.
- Therefore the **OpenAI API key must never appear in client-side code**. It lives only
  server-side, as a secret, behind a URL the widget calls.
- The user (site owner) sets the key themselves in Netlify's environment settings.
  Claude never handles the raw key.
- Work must not disturb the active `v3.0` parallel session (a separate Python `tools/`
  build system is being developed there). Chatbot code is namespaced to avoid collisions.

## 3. Architecture

```
Visitor types in widget
   -> POST /api/chat            (Netlify Function; holds OPENAI_API_KEY)
   -> OpenAI Responses API with the file_search tool
        over the "UGCC Knowledge" vector store (hosted at OpenAI)
   -> grounded answer
   -> widget renders the reply
```

The vector store hosted at OpenAI *is* the "website as a repository of knowledge." The
function is a thin, secure proxy: it holds the key, applies guardrails, and relays.

## 4. Components

### 4.1 Widget UI — `assets/js/chat-widget.js`
- Inline the existing `GlassChatWidget` (currently pulled from
  `synapsekw.github.io/ugcc_widget/widget.js`) into the repo so there is **no external
  repository dependency**. Keep the Shadow-DOM glass UI and brand red (`#d31225`).
- Bilingual welcome message (Arabic + English).
- Keeps the existing message protocol — sends `{ message, sessionId }`, expects
  `{ output }` — so the change from the current widget is minimal.
- **Enhancement:** also send the last N turns (e.g. last 6 messages) so the bot has
  short conversation memory.
- Loaded on all 67 pages with a cache-buster (`?v=`), matching the site's convention.
- The old `<script src="…github.io…">` include and the inline n8n init block are removed
  from all 67 pages.

### 4.2 Netlify Function — `netlify/functions/chat.js`
- Node function. Reads `OPENAI_API_KEY` and `OPENAI_VECTOR_STORE_ID` from env.
- Calls OpenAI's Responses API with the `file_search` tool bound to the vector store.
- **System prompt (intent):** "You are UGCC's website assistant. Answer only from the
  provided knowledge. Reply in the user's language — Arabic or English. If the answer is
  not in the knowledge, say you don't have that information and point to the contact page.
  Be concise and professional."
- **Guardrails (protect OpenAI spend):**
  - Reject messages over a length cap (e.g. 1,000 chars).
  - Light per-session / per-IP rate limiting.
  - CORS allowlist: the Netlify preview origin and (later) the Hostinger domain only.
- Returns `{ output: <answer> }`.
- Exposed at `/api/chat` via a `netlify.toml` redirect to
  `/.netlify/functions/chat` (same-origin on Netlify → no CORS needed there).

### 4.3 Knowledge build script — `tools/knowledge/build.py`
- Python (matches existing tooling; good HTML/PDF libraries).
- For each of the 67 pages: parse HTML, extract the **main content only** (strip the
  nav/header/footer/scripts/styles that repeat on every page — otherwise the knowledge is
  67× duplicated boilerplate).
- Extract text from the Company Profile PDF (`assets/img/…company_profile…pdf`).
- Write clean per-source text/markdown files under `tools/knowledge/corpus/` and commit
  them (transparent, diff-able knowledge).
- Create or update the OpenAI vector store and upload the corpus; print the vector store
  ID (which the owner puts in Netlify env).
- **Refreshing the bot's knowledge = re-run this one script.**
- Requires the OpenAI key at build time; run locally by the owner/Claude with the key in
  the environment (never committed).

### 4.4 Vector store (hosted at OpenAI)
- One vector store, "UGCC Knowledge." Free at our size (< 1 MB of text; 1 GB free tier).
- Referenced by the function via `OPENAI_VECTOR_STORE_ID`.

## 5. Model & Cost
- **Model:** `gpt-4o-mini` with file search — fast, inexpensive (~fractions of a cent per
  question), strong Arabic. Swappable to a larger model via one env/constant if more depth
  is wanted.
- **Vector storage:** free at our size.
- Guardrails above bound worst-case spend.

## 6. Bilingual handling
- OpenAI embeddings are multilingual: an Arabic question still retrieves from the English
  knowledge, and the model answers in Arabic. No separate Arabic corpus required.
- Language is auto-detected from the user's message; the system prompt instructs the model
  to mirror it.

## 7. Security
- Key only in Netlify env var; never in client code or git.
- Function validates input length, rate-limits, and restricts CORS to known origins.
- No PII collection (no lead capture in scope).

## 8. Testing / Verification
- **Local:** Netlify CLI (`netlify dev`) runs the function locally; test the widget
  end-to-end against real OpenAI (requires the key in the local env).
- **Live preview:** ask grounded questions in English and Arabic
  (e.g. "What has UGCC built in Oman?" → the Duqm commercial berth / IP3 project; the
  Arabic equivalent). Confirm answers are grounded, and that it declines gracefully on
  unknown topics.
- Confirm the key never appears in any client asset (grep the built site).
- Confirm guardrails: over-length message rejected; rate limit trips.

## 9. Deployment
- Netlify auto-builds on push to `master`; the function deploys with the site.
- Owner sets two Netlify env vars: `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`.
- **Hostinger go-live (future):** the static site can keep calling the Netlify function
  (small, free, permanent dependency) via its absolute URL with CORS allowing the
  Hostinger domain; or the function is ported to a Hostinger PHP endpoint. Deferred.

## 10. Out of scope (YAGNI)
- Lead capture / CRM routing.
- Human handoff / live chat.
- Separate Arabic knowledge base.
- Analytics dashboard.
- Voice / attachments.

## 11. Open coordination item
- The feature lands on `master`. If `v3.0` later becomes the site, the widget, function,
  `netlify.toml` redirect, and knowledge tooling must be carried into that branch.
