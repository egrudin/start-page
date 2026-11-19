#!/usr/bin/env python3
"""Генерирует набор иконок StartPage.

Дизайн: чернильный скруглённый квадрат, сетка 2×2 из бумажных квадратов,
один залит. Рендерится в 4× и уменьшается box-фильтром для чистых краёв.
Без зависимостей.
"""
from __future__ import annotations

import pathlib
import struct
import zlib

INK = (17, 17, 16)
PAPER = (244, 244, 239)

OUT = pathlib.Path(__file__).resolve().parent.parent / "icons"


def inside_rounded_rect(x: float, y: float, size: float, radius: float) -> bool:
    if x < 0 or y < 0 or x > size or y > size:
        return False
    cx = min(max(x, radius), size - radius)
    cy = min(max(y, radius), size - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def glyph_alpha(x: float, y: float) -> float:
    # Сетка 2×2: ячейки 24u, зазор 8u, обводка 4.5u. Холст — 128u.
    cells = ((36.0, 36.0), (68.0, 36.0), (36.0, 68.0), (68.0, 68.0))
    filled = (68.0, 36.0)
    stroke = 4.5
    for cx, cy in cells:
        if cx <= x <= cx + 24 and cy <= y <= cy + 24:
            if (cx, cy) == filled:
                return 1.0
            inner = (
                cx + stroke <= x <= cx + 24 - stroke
                and cy + stroke <= y <= cy + 24 - stroke
            )
            if not inner:
                return 1.0
    return 0.0


def render(size: int) -> bytes:
    scale = 4
    hi = size * scale
    unit = 128.0 / hi
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            sr = sg = sb = sa = 0.0
            for sy in range(scale):
                for sx in range(scale):
                    x = (px * scale + sx + 0.5) * unit
                    y = (py * scale + sy + 0.5) * unit
                    if not inside_rounded_rect(x, y, 128.0, 26.0):
                        continue
                    g = glyph_alpha(x, y)
                    r = INK[0] * (1 - g) + PAPER[0] * g
                    gg = INK[1] * (1 - g) + PAPER[1] * g
                    b = INK[2] * (1 - g) + PAPER[2] * g
                    sr += r
                    sg += gg
                    sb += b
                    sa += 1.0
            samples = scale * scale
            if sa == 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes(
                    (
                        round(sr / sa),
                        round(sg / sa),
                        round(sb / sa),
                        round(255 * sa / samples),
                    )
                )
        rows.append(bytes(row))

    raw = b"".join(b"\x00" + row for row in rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 96, 128):
        path = OUT / f"icon-{size}.png"
        path.write_bytes(render(size))
        print(f"{path.name}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
