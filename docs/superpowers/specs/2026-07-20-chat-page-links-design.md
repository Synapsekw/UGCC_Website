# Chat Page Links — Design Note

**Date:** 2026-07-20
**Branch:** `chat-page-links` (off `V2`)
**Status:** Implemented

## Goal

When the chatbot answers about a topic that has a dedicated page (a project,
careers, contact, a business line), it also offers direct links to those pages.
Clicking a link navigates the browser to that page (same tab).

## How it works

The knowledge corpus filenames already mirror the site's URL slugs
(`tools/knowledge/build.py`: `ra200/index.html` → `ra200.txt`). The function
exploits that mapping end-to-end:

1. **Retrieval tagging** — `formatSearchResults` prefixes each vector-store
   excerpt with `[Source page: /slug/]` derived from the result's `filename`
   (`pagePathForFilename`). The company-profile PDF has no page and gets no tag.
2. **Model contract** — the system prompt asks for an optional final line
   `LINKS: /path/ | Title; ...` (max 3), using only paths present in the
   excerpts' markers, titles in the user's language.
3. **Server validation** — `extractLinks` parses and strips that line and keeps
   only paths that were actually retrieved this turn, so the bot can never link
   to a hallucinated URL. Response becomes `{ output, links: [{url, title}] }`.
4. **Widget rendering** — `chat-widget.js` renders `links` as pill-shaped
   anchor chips under the bot bubble (brand red, arrow icon). A client-side
   guard accepts only same-site single-segment paths (`/^\/[a-z0-9-]*\/?$/i`),
   rejecting anything like `javascript:` or absolute URLs even if the server
   were compromised. Chips are plain `<a href>` — clicking loads the page.

## Compatibility

- Response shape is additive (`links` field); old cached widgets ignore it.
- Widget cache-buster bumped `?v=1` → `?v=2` on all 67 pages.
- No knowledge rebuild needed — the corpus already carries the slugs.

## Out of scope

- Persisting chat history across the navigation (chat reopens fresh on the
  target page). Could be added later via sessionStorage if wanted.
