#!/usr/bin/env python3
"""Generate sitemap.xml and robots.txt from the pages actually on disk.

Re-run this at cutover (and after any page is added or removed):

    python3 tools/gen-sitemap.py

Priorities are assigned by page role: homepage > business-line "money" pages >
category listings > project detail pages > everything else.
"""
import os
import re
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

    urls = "".join(
        f"  <url>\n    <loc>{ORIGIN}/{s}</loc>\n"
        f"    <priority>{priority(s)}</priority>\n  </url>\n"
        for s in slugs
    )
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
               f"{urls}</urlset>\n")
    open(os.path.join(root, "sitemap.xml"), "w", encoding="utf-8").write(sitemap)

    robots = ("User-agent: *\n"
              "Allow: /\n"
              "\n"
              f"Sitemap: {ORIGIN}/sitemap.xml\n")
    open(os.path.join(root, "robots.txt"), "w", encoding="utf-8").write(robots)
    print(f"sitemap.xml: {len(slugs)} URLs\nrobots.txt: written")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
