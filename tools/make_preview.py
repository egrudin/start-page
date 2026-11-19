#!/usr/bin/env python3
"""Пересобирает dev/preview.html из настоящей страницы новой вкладки.

Превью — это продакшн-разметка плюс заглушка `browser`, поэтому стили и все
UI-модули под тестом полностью совпадают с поставляемыми.
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
