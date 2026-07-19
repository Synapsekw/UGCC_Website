import argparse
import os
import sys
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
        if any(part.startswith(".") for part in html_path.parts):
            continue
        text = extract_page_text(html_path.read_text(encoding="utf-8", errors="ignore"))
        if len(text) < 40:  # skip near-empty
            continue
        slug = slug_for(html_path.parent)
        out = CORPUS / (slug + ".txt")
        out.write_text(f"Source page: /{slug}/\n\n{text}\n", encoding="utf-8")
        written.append(out)
    pdfs = list(REPO.glob(PDF_GLOB))
    if pdfs:
        ptext = extract_pdf_text(str(pdfs[0]))
        (CORPUS / "company-profile.txt").write_text(
            f"Source: UGCC Company Profile PDF\n\n{ptext}\n", encoding="utf-8")
        written.append(CORPUS / "company-profile.txt")
    return written


def upload(vector_store_id):
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
        for s in streams:
            s.close()
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
