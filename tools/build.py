#!/usr/bin/env python3
"""Собирает устанавливаемый пакет расширения.

Включает только runtime-файлы. Превью, инструменты и скриншоты в пакет
не попадают. Создаёт идентичные .zip и .xpi (XPI — это ZIP).
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

INCLUDE = [
    "manifest.json",
    "background.js",
    "icons",
    "_locales",
    "pages",
    "styles",
    "src",
    "LICENSE",
]

FIXED_TIME = (2026, 1, 1, 0, 0, 0)


def files() -> list[pathlib.Path]:
    result: list[pathlib.Path] = []
    for entry in INCLUDE:
        path = ROOT / entry
        if path.is_dir():
            result.extend(sorted(p for p in path.rglob("*") if p.is_file()))
        elif path.is_file():
            result.append(path)
        else:
            raise SystemExit(f"missing runtime file: {path}")
    return result


def write_archive(target: pathlib.Path, version: str) -> None:
    # Windows может не сразу отпустить только что прочитанный файл (индексатор,
    # антивирус); удаление перед записью делает повторные сборки предсказуемыми.
    target.unlink(missing_ok=True)
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files():
            arcname = path.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(arcname, date_time=FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())
    print(f"{target.name}: {target.stat().st_size:,} bytes ({len(files())} files), v{version}")


def main() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    DIST.mkdir(exist_ok=True)
    targets = [
        DIST / f"start-page-{version}.zip",
        DIST / f"start-page-{version}.xpi",
    ]
    for target in targets:
        write_archive(target, version)

    sums = []
    for target in targets:
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        sums.append(f"{digest}  {target.name}")
    (DIST / "SHA256SUMS.txt").write_text("\n".join(sums) + "\n", encoding="utf-8")
    print("SHA256SUMS.txt written")


if __name__ == "__main__":
    main()
