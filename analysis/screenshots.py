"""Screenshot both paywalls via the app's debug route (?v=ios|md&shot=paywall).

Viewport 390×844 at deviceScaleFactor 2. Writes out/paywall_ios.png, out/paywall_md.png and
out/disc_boxes.json (bounding box of #pw-disc in CSS px; multiply by `scale` for image px).

Start the app first, e.g.  npm run build && npm run preview   (serves http://localhost:4173)
Usage:  python screenshots.py [--url http://localhost:4173] [--out out]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SCALE = 2


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:4173")
    ap.add_argument("--out", default=str(HERE / "out"))
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    boxes: dict = {"scale": SCALE, "viewport": [390, 844]}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=SCALE, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        for mode in ("ios", "md"):
            page.goto(f"{args.url.rstrip('/')}/?v={mode}&shot=paywall")
            page.wait_for_selector("#pw-disc")
            page.evaluate("document.fonts.ready")
            page.wait_for_timeout(300)
            page.screenshot(path=str(out / f"paywall_{mode}.png"))
            boxes[mode] = page.locator("#pw-disc").bounding_box()
            print(f"{mode}: saved paywall_{mode}.png, #pw-disc box {boxes[mode]}")
        browser.close()
    (out / "disc_boxes.json").write_text(json.dumps(boxes, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
