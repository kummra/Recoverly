#!/usr/bin/env python3
"""Rebuild every icon from the one master mark, `public/icon.svg`.

    python3 scripts/build-icons.py                 # rewrites the files in public/
    python3 scripts/build-icons.py --out some/dir  # write somewhere else to compare first

Needs `rsvg-convert` (librsvg) on the PATH and nothing else; the .ico is packed here.

The master is the standard icon: a rounded square with the mark at 108%. The other files
are the same drawing with two numbers changed, so edit the master and run this:

  icon-192.png, icon-512.png   the master as drawn
  favicon.ico                  the master at 16, 32 and 48 px (PNG data inside the .ico)
  apple-icon.png (180 px)      no rounded corners: iOS rounds it itself, and a transparent
                               corner would be filled with black
  icon-maskable-512.png        no rounded corners and the mark shrunk to 82%, so that
                               Android's circle or squircle mask never cuts the "R"

After changing the mark: bump VERSION in public/sw.js (installed copies cache the old icons),
and look at the 16 px favicon, which is where a mark stops being readable first.
"""
import argparse
import shutil
import struct
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "public" / "icon.svg"

CORNER = 'rx="116"'
MARK_SCALE = "scale(1.08)"


def render(svg: str, size: int) -> bytes:
    """Draw the SVG as a square PNG of the given size (rsvg-convert reads stdin)."""
    result = subprocess.run(
        ["rsvg-convert", "-f", "png", "-w", str(size), "-h", str(size)],
        input=svg.encode(),
        capture_output=True,
        check=True,
    )
    return result.stdout


def variant(master: str, corner: int, scale: float) -> str:
    """The master with a different corner radius and mark size."""
    for needle in (CORNER, MARK_SCALE):
        if master.count(needle) != 1:
            sys.exit(f"public/icon.svg no longer contains exactly one {needle!r}; update this script to match.")
    return master.replace(CORNER, f'rx="{corner}"').replace(MARK_SCALE, f"scale({scale})")


def pack_ico(pngs: dict[int, bytes]) -> bytes:
    """An .ico holding PNG images (supported by every browser made in the last fifteen years)."""
    count = len(pngs)
    header = struct.pack("<HHH", 0, 1, count)
    offset = 6 + 16 * count
    entries = b""
    blobs = b""
    for size, data in sorted(pngs.items()):
        entries += struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
        blobs += data
    return header + entries + blobs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=MASTER.parent, help="directory to write into (default: public/)")
    out = parser.parse_args().out

    if shutil.which("rsvg-convert") is None:
        sys.exit("rsvg-convert was not found. Install librsvg (macOS: brew install librsvg, or MacPorts).")

    master = MASTER.read_text()
    full_bleed = variant(master, 0, 1.0)
    maskable = variant(master, 0, 0.82)

    out.mkdir(parents=True, exist_ok=True)
    files = {
        "icon-192.png": render(master, 192),
        "icon-512.png": render(master, 512),
        "apple-icon.png": render(full_bleed, 180),
        "icon-maskable-512.png": render(maskable, 512),
        "favicon.ico": pack_ico({size: render(master, size) for size in (16, 32, 48)}),
    }
    for name, data in files.items():
        (out / name).write_bytes(data)
        print(f"wrote {out / name} ({len(data):,} bytes)")


if __name__ == "__main__":
    main()
