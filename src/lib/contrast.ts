// WCAG 2.x relative luminance and contrast ratio.
export type RGB = [number, number, number];

export function parseColor(input: string): RGB {
  const s = input.trim().toLowerCase();
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [r, g, b];
  }
  throw new Error(`Unsupported colour: ${input}`);
}

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminance(rgb: RGB): number {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrastRatio(fg: string | RGB, bg: string | RGB): number {
  const a = luminance(typeof fg === "string" ? parseColor(fg) : fg);
  const b = luminance(typeof bg === "string" ? parseColor(bg) : bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** "Within 10%" as defined in §10.2: |a − b| ≤ max(1, 0.1 × max(a, b)). */
export function within10(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1, 0.1 * Math.max(a, b));
}
