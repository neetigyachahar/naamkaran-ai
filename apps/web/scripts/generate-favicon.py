#!/usr/bin/env python3
"""Generate white-padded rounded favicons from logo.png (blue mark)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC = PUBLIC / "logo.png"

# Same inset as the white mark inside logo-square (~16%).
PADDING_RATIO = 0.158
OUTER_RADIUS_RATIO = 0.1875


def rounded_mask(size: int, radius: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def load_logo_mark() -> Image.Image:
    logo = Image.open(SRC).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    return logo


def compose(size: int) -> Image.Image:
    logo = load_logo_mark()
    pad = max(1, round(size * PADDING_RATIO))
    inner = size - pad * 2

    lw, lh = logo.size
    scale = min(inner / lw, inner / lh)
    nw, nh = max(1, round(lw * scale)), max(1, round(lh * scale))
    logo_resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.paste(logo_resized, (x, y), logo_resized)

    radius = size * OUTER_RADIUS_RATIO
    mask = rounded_mask(size, radius)
    out = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    out.paste(canvas, (0, 0), mask)
    return out


def save_png(path: Path, size: int) -> None:
    compose(size).save(path, optimize=True)


def save_ico(path: Path) -> None:
    sizes = [16, 32, 48]
    images = [compose(s) for s in sizes]
    images[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[1:],
    )


def main() -> None:
    save_png(PUBLIC / "favicon-16.png", 16)
    save_png(PUBLIC / "favicon-32.png", 32)
    save_png(PUBLIC / "apple-touch-icon.png", 180)
    save_ico(PUBLIC / "favicon.ico")
    save_png(PUBLIC / "logo-16.png", 16)
    save_png(PUBLIC / "logo-32.png", 32)
    print("Wrote favicon assets to", PUBLIC)


if __name__ == "__main__":
    main()
