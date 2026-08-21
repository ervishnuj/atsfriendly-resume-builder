"""PDF export validation.

Prints every rendered fixture (all built-in templates x generated/imported
resumes) to A4 PDF with headless Chromium, then asserts each export:

  1. embeds only TrueType fonts (no bitmap/Type3 rasterized glyphs),
  2. embeds every font it uses, with a Unicode ToUnicode map,
  3. keeps the resume text selectable (pdftotext finds the key content),
  4. contains zero raster images (i.e. no screenshot-based rendering),
  5. excludes non-resume dashboard chrome.

Exit code is non-zero if any check fails.
"""

import asyncio
import glob
import json
import os
import subprocess
import sys

OUT = os.environ.get("PDFQA_DIR", "/tmp/pdf-export-qa")

# Text that must survive the export on every template.
REQUIRED = {
    "": ["Vishnu Jayaraman", "Senior Software Engineer", "Anna University", "TypeScript", "42%"],
    "--imported": ["Krishnan-M", "Northwind Analytics", "IIT Madras", "dbt", "31%"],
}
FORBIDDEN = ["dashboard chrome"]


def run(*cmd: str) -> str:
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout


async def print_pdfs(ids):
    from playwright.async_api import async_playwright

    os.makedirs(f"{OUT}/pdf", exist_ok=True)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        for case_id in ids:
            await page.goto(f"file://{OUT}/html/{case_id}.html", wait_until="load")
            await page.pdf(path=f"{OUT}/pdf/{case_id}.pdf", format="A4", print_background=True)
        await browser.close()


def check(case_id: str) -> list[str]:
    path = f"{OUT}/pdf/{case_id}.pdf"
    errs: list[str] = []

    # --- fonts ---
    font_lines = [l for l in run("pdffonts", path).splitlines()[2:] if l.strip()]
    if not font_lines:
        errs.append("no fonts embedded — output is likely rasterized")
    for line in font_lines:
        cols = line.split()
        name, ftype = cols[0], " ".join(cols[1:-6]) if len(cols) > 7 else cols[1]
        emb, uni = cols[-5], cols[-3]
        if "TrueType" not in line:
            errs.append(f"font {name} is {ftype}, expected TrueType")
        if emb != "yes":
            errs.append(f"font {name} is not embedded")
        if uni != "yes":
            errs.append(f"font {name} has no ToUnicode map (text would not be selectable)")

    # --- no rasterization ---
    images = [l for l in run("pdfimages", "-list", path).splitlines()[2:] if l.strip()]
    if images:
        errs.append(f"{len(images)} raster image(s) found — export must be vector text")

    # --- selectable text ---
    text = run("pdftotext", "-layout", path, "-")
    suffix = "--imported" if case_id.endswith("--imported") else ""
    for needle in REQUIRED[suffix]:
        if needle not in text:
            errs.append(f"missing selectable text: {needle!r}")
    for needle in FORBIDDEN:
        if needle in text:
            errs.append(f"non-resume content leaked into PDF: {needle!r}")

    return errs


def main() -> int:
    with open(f"{OUT}/cases.json") as f:
        ids = json.load(f)
    asyncio.run(print_pdfs(ids))

    failed = 0
    for case_id in ids:
        errs = check(case_id)
        if errs:
            failed += 1
            print(f"FAIL {case_id}")
            for e in errs:
                print(f"      - {e}")
        else:
            print(f"PASS {case_id}")

    print(f"\n{len(ids) - failed}/{len(ids)} exports valid")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
