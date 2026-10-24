"""Visual-salience check of the disclosure text in both paywall screenshots.

For each version: share = spectral-residual saliency inside the #pw-disc box / total saliency.
Also estimates WCAG contrast of the disclosure from sampled text and background pixels.
Exits with code 1 if the two shares differ by more than 10% (relative).

Run screenshots.py first.   Usage:  python saliency.py [--dir out]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
TOLERANCE = 0.10
# Spectral residual runs on a downscaled copy. OpenCV's default is a 64×64 square, which squashes the
# 390×844 screen and leaves the 3-line, 11px disclosure under two grid rows, so the share mostly reflects
# where the box falls between cells. We keep the aspect ratio and use a 256px-wide working image, where
# the text lines are resolved. The sweep below prints other sizes so the choice is visible.
WORK_WIDTH = 256
SWEEP = (64, 128, 192, 256, 320)


def saliency_map(img: np.ndarray, work_width: int) -> np.ndarray:
    sal = cv2.saliency.StaticSaliencySpectralResidual_create()
    sal.setImageWidth(work_width)
    sal.setImageHeight(int(round(work_width * img.shape[0] / img.shape[1])))
    ok, smap = sal.computeSaliency(img)
    if not ok:
        raise RuntimeError("saliency failed")
    return smap.astype(np.float64)


def box_px(box: dict, scale: float) -> tuple[int, int, int, int]:
    return (
        int(round(box["x"] * scale)),
        int(round(box["y"] * scale)),
        int(round((box["x"] + box["width"]) * scale)),
        int(round((box["y"] + box["height"]) * scale)),
    )


def wcag_contrast(fg: np.ndarray, bg: np.ndarray) -> float:
    def lum(rgb: np.ndarray) -> float:
        c = rgb / 255.0
        c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
        return float(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])

    a, b = lum(fg), lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def analyse(img_path: Path, box: dict, scale: float, heat_path: Path) -> dict:
    img = cv2.imread(str(img_path))
    if img is None:
        raise FileNotFoundError(img_path)
    smap = saliency_map(img, WORK_WIDTH)
    x0, y0, x1, y1 = box_px(box, scale)
    share = float(smap[y0:y1, x0:x1].sum() / smap.sum())

    # Text colour ≈ darkest anti-aliasing-free pixels; background ≈ brightest, inside the box.
    region = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2RGB).reshape(-1, 3).astype(np.float64)
    luma = region @ np.array([0.2126, 0.7152, 0.0722])
    fg = region[luma <= np.percentile(luma, 2)].mean(axis=0)
    bg = region[luma >= np.percentile(luma, 90)].mean(axis=0)

    heat = cv2.applyColorMap((255 * smap / smap.max()).astype(np.uint8), cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(img, 0.45, heat, 0.55, 0)
    cv2.rectangle(overlay, (x0, y0), (x1, y1), (255, 255, 255), 2)
    cv2.imwrite(str(heat_path), overlay)

    return {
        "share": share,
        "contrast": wcag_contrast(fg, bg),
        "fg": "#%02X%02X%02X" % tuple(int(round(v)) for v in fg),
        "bg": "#%02X%02X%02X" % tuple(int(round(v)) for v in bg),
        "area_px": (x1 - x0) * (y1 - y0),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=str(HERE / "out"))
    args = ap.parse_args()
    d = Path(args.dir)
    boxes = json.loads((d / "disc_boxes.json").read_text(encoding="utf-8"))
    scale = boxes.get("scale", 2)

    res = {m: analyse(d / f"paywall_{m}.png", boxes[m], scale, d / f"saliency_{m}.png") for m in ("ios", "md")}

    print(f"{'':28}{'iOS':>14}{'Android':>14}")
    print(f"{'Disclosure saliency share':28}{res['ios']['share']:>14.4f}{res['md']['share']:>14.4f}")
    print(f"{'Disclosure contrast (WCAG)':28}{res['ios']['contrast']:>13.2f}:1{res['md']['contrast']:>12.2f}:1")
    print(f"{'  sampled text / bg':28}{res['ios']['fg'] + '/' + res['ios']['bg']:>14}{res['md']['fg'] + '/' + res['md']['bg']:>14}")
    print(f"{'Disclosure box (image px^2)':28}{res['ios']['area_px']:>14}{res['md']['area_px']:>14}")

    print(f"\nRobustness sweep (working width, aspect preserved; check uses {WORK_WIDTH}px):")
    imgs = {m: cv2.imread(str(d / f"paywall_{m}.png")) for m in ("ios", "md")}
    for w in SWEEP:
        sh = {}
        for m, img in imgs.items():
            x0, y0, x1, y1 = box_px(boxes[m], scale)
            smap = saliency_map(img, w)
            sh[m] = smap[y0:y1, x0:x1].sum() / smap.sum()
        print(f"  {w:>4}px  iOS {sh['ios']:.4f}  Android {sh['md']:.4f}  rel diff {abs(sh['ios'] - sh['md']) / max(sh.values()):.1%}")

    a, b = res["ios"]["share"], res["md"]["share"]
    rel = abs(a - b) / max(a, b)
    print(f"\nRelative difference in saliency share: {rel:.1%} (tolerance {TOLERANCE:.0%})")
    print(f"Heatmaps: {d / 'saliency_ios.png'}, {d / 'saliency_md.png'}")
    if rel > TOLERANCE:
        print("FAIL: disclosure salience differs between conditions by more than 10%.")
        return 1
    print("PASS: disclosure salience is equivalent across conditions.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
