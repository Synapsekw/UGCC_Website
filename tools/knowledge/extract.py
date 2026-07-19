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
    # Prefer <main>; fall back to <body>, then the whole document.
    root = soup.find("main") or soup.body or soup
    text = root.get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()


def extract_pdf_text(path: str) -> str:
    reader = PdfReader(path)
    parts = [(page.extract_text() or "") for page in reader.pages]
    text = "\n".join(parts)
    return re.sub(r"[ \t]+", " ", text).strip()
