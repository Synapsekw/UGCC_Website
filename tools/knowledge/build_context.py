"""Build the chatbot's knowledge base straight from the website's own pages.

Writes netlify/functions/knowledge.mjs, which chat.mjs sends to the model with
every question. Because the whole site fits comfortably in the model's context,
the bot sees everything at once (no "top 8 snippets" retrieval), so it can count,
list and compare projects, and it is always in step with the site.

Re-run after ANY content change to the site, then commit the result:

    python3 tools/knowledge/build_context.py

It needs only beautifulsoup4 (and pypdf if the company-profile PDF is present).
"""

import json
import re
import sys
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "netlify" / "functions" / "knowledge.mjs"
PDF_GLOB = "assets/img/*company_profile*.pdf"

# Listing pages -> what membership in them tells us about a project.
STATUS_PAGES = {"all-project-current": "Current (ongoing)", "all-projects-completed": "Completed"}
BUSINESS_LINES = {
    "roads-and-bridges": "Roads and Bridges",
    "civil": "Civil Infrastructure",
    "building-construction": "Building Construction",
    "micro-tunneling": "Micro-Tunneling",
    "water": "Water & Waste Water",
    "electro-mechanical": "Electro-Mechanical",
    "oil-and-gas": "Oil and Gas",
}
# Company / general pages, in the order the model should read them.
GENERAL_ORDER = [
    ".", "about-contractor-kuwait", "credentials", "business-lines-construction-services-kuwait",
    "roads-and-bridges-contractor-kuwait", "civil-infrastructure-kuwait", "building-construction-kuwait",
    "micro-tunneling-kuwait", "water-treatment-plant-kuwait", "electro-mechanical-contractor-kuwait",
    "oil-and-gas-construction-kuwait", "facilities-overview-construction-equipment-kuwait", "equipment",
    "plants", "laboratories", "hse", "quality", "csr", "careers", "contact-us",
]
# Text that repeats at the bottom of every page (contact block) - kept once, on the contact page.
FOOTER_RE = re.compile(r"(Project Owners\s*)?Headquarters United Gulf Construction Company.*$", re.S)


def page_lines(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    for el in soup.select("script, style, noscript, header, footer, nav, form, button, svg"):
        el.decompose()
    root = soup.find("main") or soup.body or soup
    lines = [re.sub(r"\s+", " ", x).strip() for x in root.get_text("\n").split("\n")]
    return [x for x in lines if x]


def main_links(html: str) -> set[str]:
    soup = BeautifulSoup(html, "html.parser")
    root = soup.find("main") or soup.body or soup
    return {a["href"].strip("/") for a in root.find_all("a", href=True) if a["href"].startswith("/")}


def after(lines: list[str], *labels: str) -> str:
    """Value that follows a label line, e.g. 'Project Owner' -> next line(s)."""
    for i, line in enumerate(lines):
        for label in labels:
            if line == label and i + 1 < len(lines):
                return lines[i + 1]
            if line.startswith(label + " ") and len(line) > len(label) + 1:
                return line[len(label):].strip(" :")
    return ""


def clean_text(lines: list[str]) -> str:
    text = " ".join(lines)
    text = FOOTER_RE.sub("", text).strip()
    return re.sub(r"\s+", " ", text)


def build() -> tuple[str, dict]:
    pages = {}
    for html_path in sorted(REPO.glob("**/index.html")):
        rel = html_path.parent.relative_to(REPO)
        if any(p.startswith(".") for p in rel.parts) or str(rel).startswith(("tools", "docs", "node_modules")):
            continue
        pages[str(rel)] = html_path.read_text(encoding="utf-8", errors="ignore")

    lines = {slug: page_lines(html) for slug, html in pages.items()}
    is_project = {s for s, ls in lines.items() if "Project Owner" in ls or "Project Value" in ls}

    status, lines_of = {}, {s: set() for s in is_project}
    for listing, label in STATUS_PAGES.items():
        for s in main_links(pages.get(listing, "")) & is_project:
            status[s] = label
    for prefix, label in BUSINESS_LINES.items():
        for suffix in ("current", "completed"):
            for s in main_links(pages.get(f"{prefix}-{suffix}", "")) & is_project:
                lines_of[s].add(label)
                status.setdefault(s, "Current (ongoing)" if suffix == "current" else "Completed")

    projects = []
    for s in sorted(is_project):
        ls = lines[s]
        body = clean_text(ls)
        head = body.split("Similar Projects")[0]
        country = "Oman" if re.search(r"\bOman\b|Muscat|Duqm|Seeb", head) else "Kuwait"
        projects.append({
            "title": ls[0],
            "ref": ls[1] if len(ls) > 1 else "",
            "status": status.get(s, "Not stated"),
            "country": country,
            "business_lines": ", ".join(sorted(lines_of[s])) or "Not stated",
            "owner": after(ls, "Project Owner"),
            "consultant": after(ls, "Consultant"),
            "start": after(ls, "Date of Commencement", "Year of Commencement"),
            "end": after(ls, "Date of Completion", "Year of Completion"),
            "value": after(ls, "Project Value"),
            "url": f"/{s}/",
            "text": body,
        })

    # ---- assemble the knowledge text ----
    out = []
    out.append("# UGCC WEBSITE KNOWLEDGE BASE")
    out.append(f"Built from the ugcc.com website pages on {date.today().isoformat()}.")

    out.append("\n## PROJECT INDEX (every project that has its own page on the website)")
    for label in ("Current (ongoing)", "Completed", "Not stated"):
        group = [p for p in projects if p["status"] == label]
        if not group:
            continue
        out.append(f"\n### {label} projects: {len(group)}")
        for p in group:
            out.append(
                f"- {p['title']} | Ref: {p['ref']} | Country: {p['country']} | Business line: {p['business_lines']}"
                f" | Owner: {p['owner'] or 'n/a'} | Start: {p['start'] or 'n/a'} | Completion: {p['end'] or 'n/a'}"
                f" | Value: {p['value'] or 'n/a'} | Page: {p['url']}")
    by_country = {}
    for p in projects:
        by_country.setdefault(p["country"], []).append(p)
    out.append("\n### Totals (projects with a page on the website)")
    out.append(f"- All: {len(projects)} (current: {sum(p['status'].startswith('Current') for p in projects)},"
               f" completed: {sum(p['status'] == 'Completed' for p in projects)})")
    for c, ps in sorted(by_country.items()):
        cur = sum(p["status"].startswith("Current") for p in ps)
        out.append(f"- {c}: {len(ps)} (current: {cur}, completed: {len(ps) - cur})")
    for label in BUSINESS_LINES.values():
        n = sum(label in p["business_lines"] for p in projects)
        if n:
            out.append(f"- {label}: {n}")

    out.append("\n## COMPANY PAGES")
    for s in GENERAL_ORDER:
        if s in lines and s not in is_project:
            text = clean_text(lines[s]) if s != "contact-us" else re.sub(r"\s+", " ", " ".join(lines[s]))
            name = "home" if s == "." else s
            out.append(f"\n### Page /{'' if s == '.' else s + '/'} ({name})\n{text}")

    out.append("\n## PROJECT PAGES (full detail)")
    for p in projects:
        out.append(f"\n### {p['title']} ({p['url']})\n{p['text']}")

    pdfs = sorted(REPO.glob(PDF_GLOB))
    if pdfs:
        try:
            from pypdf import PdfReader
            ptext = "\n".join((pg.extract_text() or "") for pg in PdfReader(str(pdfs[0])).pages)
            ptext = re.sub(r"[ \t]+", " ", ptext).strip()
            out.append("\n## UGCC COMPANY PROFILE (PDF download on the website; includes older projects not shown"
                       " as pages)\n" + ptext)
        except Exception as e:  # PDF is a bonus; never block the build on it
            print(f"warning: company profile PDF skipped ({e})", file=sys.stderr)

    text = "\n".join(out)
    stats = {"projects": len(projects), "chars": len(text),
             "by_country": {c: len(ps) for c, ps in by_country.items()}}
    return text, stats


def main():
    text, stats = build()
    OUT.write_text(
        "// GENERATED by tools/knowledge/build_context.py - do not edit by hand.\n"
        "// Re-run that script after changing any page, then commit this file.\n"
        f"export const KNOWLEDGE_STATS = {json.dumps(stats)};\n"
        f"export const KNOWLEDGE = {json.dumps(text, ensure_ascii=False)};\n",
        encoding="utf-8")
    print(f"Wrote {OUT.relative_to(REPO)}: {stats}")


if __name__ == "__main__":
    main()
