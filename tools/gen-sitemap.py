#!/usr/bin/env python3
"""Generate sitemap.xml and robots.txt from the pages actually on disk.

Re-run this at cutover (and after any page is added or removed):

    python3 tools/gen-sitemap.py

Priorities are assigned by page role: homepage > business-line "money" pages >
category listings > project detail pages > everything else.
"""
import os
import re
import subprocess
import sys

ORIGIN = "https://ugcc.com"
SKIP_DIRS = (".git", "node_modules", "docs", "tests", "tools", "netlify", "assets", ".claude",
             ".github")
# Pages that exist but should not be advertised to crawlers.
EXCLUDE = set()

MONEY = {
    "about-contractor-kuwait", "business-lines-construction-services-kuwait",
    "roads-and-bridges-contractor-kuwait", "civil-infrastructure-kuwait",
    "building-construction-kuwait", "micro-tunneling-kuwait",
    "water-treatment-plant-kuwait", "oil-and-gas-construction-kuwait",
    "electro-mechanical-contractor-kuwait", "construction-projects-kuwait",
    "facilities-overview-construction-equipment-kuwait", "contact-us", "credentials",
}
LISTING = re.compile(r"(^all-project|-completed$|-current$)")


def priority(slug):
    if not slug:
        return "1.0"
    if slug in MONEY:
        return "0.9"
    if LISTING.search(slug):
        return "0.7"
    return "0.6"


def lastmod(root, slug):
    """Date of the last commit that touched this page, as YYYY-MM-DD.

    Deliberately git's commit date and not the file's mtime. mtime records
    when the working tree last wrote the file, which a branch switch or a
    fresh clone rewrites wholesale — on 2026-07-20 a `git checkout` restamped
    every page in this repo, which would have published a sitemap claiming
    all 67 pages changed that day. The commit date is what actually happened
    to the content.

    Returns None for a page git does not know about (never committed, or no
    git available); the caller then omits <lastmod> for that URL rather than
    inventing one. An absent lastmod is ignored by crawlers; a wrong one
    trains them to distrust the whole file.
    """
    path = os.path.join(slug, "index.html") if slug else "index.html"
    try:
        out = subprocess.run(
            ["git", "-C", root, "log", "-1", "--format=%cs", "--", path],
            capture_output=True, text=True, timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    date = out.stdout.strip()
    return date if re.fullmatch(r"\d{4}-\d{2}-\d{2}", date) else None


def main(root):
    slugs = []
    for dirpath, dirnames, files in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if "index.html" not in files:
            continue
        slug = os.path.relpath(dirpath, root).strip("./")
        slug = "" if slug == "." else slug
        if slug in EXCLUDE:
            continue
        slugs.append(slug)
    slugs.sort(key=lambda s: (priority(s), s))

    def block(s):
        lm = lastmod(root, s)
        out = f"  <url>\n    <loc>{ORIGIN}/{s}</loc>\n"
        if lm:
            out += f"    <lastmod>{lm}</lastmod>\n"
        out += f"    <priority>{priority(s)}</priority>\n  </url>\n"
        return out

    urls = "".join(block(s) for s in slugs)
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
               f"{urls}</urlset>\n")
    open(os.path.join(root, "sitemap.xml"), "w", encoding="utf-8").write(sitemap)

    robots = ("User-agent: *\n"
              "Allow: /\n"
              "\n"
              f"Sitemap: {ORIGIN}/sitemap.xml\n")
    open(os.path.join(root, "robots.txt"), "w", encoding="utf-8").write(robots)
    dated = sum(1 for s in slugs if lastmod(root, s))
    print(f"sitemap.xml: {len(slugs)} URLs ({dated} with lastmod)\nrobots.txt: written")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
