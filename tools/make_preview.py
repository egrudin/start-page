#!/usr/bin/env python3
"""Regenerate dev/preview.html from the real new tab page.

The preview is the production markup plus a mock `browser` object, so the
stylesheet and every UI module under test are exactly the shipped ones.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "pages" / "newtab.html"
TARGET = ROOT / "dev" / "preview.html"

html = SOURCE.read_text(encoding="utf-8")
html, count = re.subn(r"<title>.*?</title>", "<title>StartPage — preview</title>", html, count=1)
if count != 1:
    raise SystemExit("page title not found")
needle = '<script src="../src/boot.js"></script>'
if needle not in html:
    raise SystemExit("boot script tag not found")
html = html.replace(needle, '<script src="./mock-browser.js"></script>\n  ' + needle)
TARGET.write_text(html, encoding="utf-8")
print(f"wrote {TARGET} ({len(html)} bytes)")
