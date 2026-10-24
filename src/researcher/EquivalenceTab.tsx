import { useCallback, useEffect, useRef, useState } from "react";
import { contrastRatio, within10 } from "../lib/contrast";
import { computeTrialEnd } from "../studynest/copy";
import { StaticPaywall } from "../studynest/StudyNestApp";
import type { Condition } from "../types";

type Measure = {
  discFont: number;
  discContrast: number;
  discArea: number;
  gap: number;
  declineFont: number;
  declineContrast: number;
  checkFont: number;
  ctaHeight: number;
  typeface: string;
};

type Row = { label: string; key: keyof Measure; kind: "within" | "varies"; fmt: (v: number | string) => string };

const n = (d: number) => (v: number | string) => (typeof v === "number" ? v.toFixed(d) : v);

const ROWS: Row[] = [
  { label: "Disclosure font size (px)", key: "discFont", kind: "within", fmt: n(1) },
  { label: "Disclosure colour contrast (WCAG vs paywall background)", key: "discContrast", kind: "within", fmt: (v) => `${n(2)(v)}:1` },
  { label: "Disclosure area (px²)", key: "discArea", kind: "within", fmt: n(0) },
  { label: "Gap: main button bottom → disclosure top (px)", key: "gap", kind: "within", fmt: n(1) },
  { label: "Decline link font size (px)", key: "declineFont", kind: "within", fmt: n(1) },
  { label: "Decline link contrast", key: "declineContrast", kind: "within", fmt: (v) => `${n(2)(v)}:1` },
  { label: "Check-box label font size (px)", key: "checkFont", kind: "within", fmt: n(1) },
  { label: "Main button height (px)", key: "ctaHeight", kind: "varies", fmt: n(1) },
  { label: "Typeface", key: "typeface", kind: "varies", fmt: (v) => String(v) },
];

function q(root: Element, sel: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
}

export function measurePaywall(root: Element): Measure {
  const pw = q(root, ".pw");
  const disc = q(root, ".disc");
  const cta = q(root, ".pw-cta");
  const decline = q(root, ".pw-decline");
  const check = q(root, ".pw-check");
  const cs = (el: Element) => getComputedStyle(el);
  const bg = cs(pw).backgroundColor;
  const dr = disc.getBoundingClientRect();
  const cr = cta.getBoundingClientRect();
  return {
    discFont: parseFloat(cs(disc).fontSize),
    discContrast: contrastRatio(cs(disc).color, bg),
    discArea: dr.width * dr.height,
    gap: dr.top - cr.bottom,
    declineFont: parseFloat(cs(decline).fontSize),
    declineContrast: contrastRatio(cs(decline).color, bg),
    checkFont: parseFloat(cs(check).fontSize),
    ctaHeight: cr.height,
    typeface: cs(pw).fontFamily.split(",")[0].replace(/["']/g, "").trim(),
  };
}

export function EquivalenceTab() {
  const iosRef = useRef<HTMLDivElement>(null);
  const mdRef = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<Record<Condition, Measure> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trialEnd = computeTrialEnd();

  const measure = useCallback(() => {
    try {
      if (iosRef.current && mdRef.current) setM({ ios: measurePaywall(iosRef.current), md: measurePaywall(mdRef.current) });
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    measure();
    let alive = true;
    void document.fonts?.ready.then(() => alive && measure());
    window.addEventListener("resize", measure);
    return () => {
      alive = false;
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <>
      <p className="note">
        Both paywalls below are rendered from the same component in the default state (Yearly, auto-renew on) with logging off.
        "Within 10%" means |a − b| ≤ max(1, 0.1 × max(a, b)). Measured after web fonts load.
      </p>
      <div className="toolbar">
        <button className="btn ghost sm" onClick={measure}>
          Re-measure
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table data-testid="equivalence-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>iOS</th>
              <th>Android</th>
              <th>Equal?</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const a = m?.ios[r.key];
              const b = m?.md[r.key];
              const equal = r.kind === "within" && typeof a === "number" && typeof b === "number" ? within10(a, b) : null;
              return (
                <tr key={r.key} data-kind={r.kind} data-equal={equal == null ? undefined : String(equal)}>
                  <td>{r.label}</td>
                  <td className="mono">{a == null ? "…" : r.fmt(a)}</td>
                  <td className="mono">{b == null ? "…" : r.fmt(b)}</td>
                  <td>
                    {r.kind === "varies" ? (
                      <span className="pill">varies by design</span>
                    ) : equal == null ? (
                      "…"
                    ) : (
                      <span className={`pill ${equal ? "ok" : "warn"}`}>{equal ? "within 10%" : "differs"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="equiv-shots">
        <div className="equiv-shot" ref={iosRef}>
          <div className="tile-label">iOS style</div>
          <StaticPaywall mode="ios" trialEnd={trialEnd} discId={null} framed={false} />
        </div>
        <div className="equiv-shot" ref={mdRef}>
          <div className="tile-label">Android style</div>
          <StaticPaywall mode="md" trialEnd={trialEnd} discId={null} framed={false} />
        </div>
      </div>
    </>
  );
}
