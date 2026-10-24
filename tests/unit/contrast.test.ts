import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor, within10 } from "../../src/lib/contrast";

describe("contrast", () => {
  it("#8E8E93 on white is about 3.26:1", () => {
    expect(contrastRatio("#8E8E93", "#FFFFFF")).toBeGreaterThan(3.24);
    expect(contrastRatio("#8E8E93", "#FFFFFF")).toBeLessThan(3.28);
  });

  it("black on white is 21:1 and order does not matter", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 5);
  });

  it("parses computed-style rgb() strings", () => {
    expect(parseColor("rgb(142, 142, 147)")).toEqual([142, 142, 147]);
    expect(parseColor("rgba(255, 255, 255, 1)")).toEqual([255, 255, 255]);
  });

  it("within10 follows §10.2", () => {
    expect(within10(11, 11.9)).toBe(true); // |Δ| ≤ 1
    expect(within10(100, 110)).toBe(true);
    expect(within10(100, 112)).toBe(false);
  });
});
