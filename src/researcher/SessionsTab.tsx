import { useCallback, useEffect, useRef, useState } from "react";
import { manipPass, toCSV, toJSON, trustMean } from "../lib/export";
import { loadAllSessions } from "../lib/storage";
import { computeTrialEnd } from "../studynest/copy";
import { StaticPaywall } from "../studynest/StudyNestApp";
import type { Condition, Session } from "../types";

const LABEL: Record<Condition, string> = { ios: "iOS", md: "Android" };

const secs = (ms: number | null | undefined) => (ms == null ? "—" : (ms / 1000).toFixed(1));

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function tryDownload(name: string, text: string, mime: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

export function SessionsTab() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [remoteError, setRemoteError] = useState<string>();
  const [fallback, setFallback] = useState<{ name: string; text: string } | null>(null);
  const [msg, setMsg] = useState<string>("");

  const load = useCallback(async () => {
    const r = await loadAllSessions();
    setSessions(r.sessions);
    setRemoteError(r.remoteError);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!sessions) return <p className="status-msg">Loading sessions…</p>;

  const included = sessions.filter((s) => !s.demo && s.status === "complete");
  const by = (c: Condition) => included.filter((s) => s.condition === c);
  const suscPct = (c: Condition) => {
    const g = by(c);
    return g.length ? `${Math.round((100 * g.filter((s) => s.metrics?.susceptible).length) / g.length)}%` : "—";
  };
  const trust = (c: Condition) => {
    const m = mean(by(c).map(trustMean).filter((x): x is number => x != null));
    return m == null ? "—" : m.toFixed(2);
  };

  async function exportData(kind: "csv" | "json") {
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `studynest_${kind === "csv" ? "summary" : "full"}_${stamp}.${kind}`;
    const text = kind === "csv" ? toCSV(sessions!) : toJSON(sessions!);
    setFallback(null);
    if (tryDownload(name, text, kind === "csv" ? "text/csv" : "application/json")) return setMsg(`Downloaded ${name}`);
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Download failed; copied to clipboard instead.");
    } catch {
      setMsg("Download and clipboard both failed; select the text below.");
      setFallback({ name, text });
    }
  }

  return (
    <>
      <div className="tiles">
        <Tile label="Complete sessions" value={included.length} sub="excl. demo & incomplete" />
        <Tile label="iOS n" value={by("ios").length} />
        <Tile label="Android n" value={by("md").length} />
        <Tile label="Susceptible" value={`${suscPct("ios")} / ${suscPct("md")}`} sub="iOS / Android" />
        <Tile label="Mean trust" value={`${trust("ios")} / ${trust("md")}`} sub="iOS / Android (1–7)" />
      </div>

      <div className="toolbar">
        <button className="btn primary sm" onClick={() => exportData("csv")}>
          Download summary CSV
        </button>
        <button className="btn ghost sm" onClick={() => exportData("json")}>
          Download full JSON
        </button>
        <button className="btn ghost sm" onClick={() => void load()}>
          Refresh
        </button>
        {msg && <span className="status-msg">{msg}</span>}
        {remoteError && <span className="pill bad" title={remoteError}>Firestore read failed — showing local only</span>}
      </div>
      {fallback && (
        <textarea readOnly rows={8} value={fallback.text} onFocus={(e) => e.currentTarget.select()} aria-label={fallback.name} style={{ marginBottom: 16, fontFamily: "var(--mono)", fontSize: 12 }} />
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Style</th>
              <th>Own phone</th>
              <th>Outcome</th>
              <th>Susceptible</th>
              <th>Paywall s</th>
              <th>Decision s</th>
              <th>Disclosure seen s</th>
              <th>Details taps</th>
              <th>Trust mean</th>
              <th>Style check</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td colSpan={12} className="status-msg">
                  No sessions yet.
                </td>
              </tr>
            )}
            {sessions.map((s) => {
              const pass = manipPass(s);
              const tm = trustMean(s);
              return (
                <tr key={s.id}>
                  <td className="mono">
                    {s.id} {s.demo && <span className="pill warn">demo</span>}
                  </td>
                  <td>{s.condition ? LABEL[s.condition] : "—"}</td>
                  <td>{s.bg?.own ?? "—"}</td>
                  <td>{s.metrics?.outcome ?? "—"}</td>
                  <td>{s.metrics ? <span className={`pill ${s.metrics.susceptible ? "bad" : "ok"}`}>{s.metrics.susceptible ? "yes" : "no"}</span> : "—"}</td>
                  <td className="num">{secs(s.metrics?.paywall_dwell_ms)}</td>
                  <td className="num">{secs(s.metrics?.decision_latency_ms)}</td>
                  <td className="num">{secs(s.metrics?.disclosure_visible_ms)}</td>
                  <td className="num">{s.metrics?.view_details_taps ?? "—"}</td>
                  <td className="num">{tm == null ? "—" : tm.toFixed(2)}</td>
                  <td>{pass == null ? "—" : <span className={`pill ${pass ? "ok" : "bad"}`}>{pass ? "pass" : "fail"}</span>}</td>
                  <td>{s.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="panel-title" style={{ marginTop: 32 }}>
        Paywall tap heatmap
      </h2>
      <p className="note">
        Taps on the paywall from {included.length ? "complete, non-demo sessions" : "all sessions (no complete sessions yet)"}. Positions are
        normalised to the device frame, so desktop sessions (with the fake status bar) are offset slightly.
      </p>
      <div className="heat">
        {(["ios", "md"] as Condition[]).map((c) => (
          <Heatmap key={c} mode={c} sessions={(included.length ? included : sessions).filter((s) => s.condition === c)} />
        ))}
      </div>
    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}

function Heatmap({ mode, sessions }: { mode: Condition; sessions: Session[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const taps = sessions.flatMap((s) => s.events.filter((e) => e.type === "tap" && e.screen === "paywall" && e.x != null && e.y != null));

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const t of taps) {
      const x = t.x! * cv.width;
      const y = t.y! * cv.height;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 28);
      g.addColorStop(0, "rgba(229, 72, 50, 0.45)");
      g.addColorStop(1, "rgba(229, 72, 50, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 28, y - 28, 56, 56);
    }
  }, [taps]);

  return (
    <div>
      <div className="tile-label" style={{ marginBottom: 8 }}>
        {LABEL[mode]} · {taps.length} taps
      </div>
      <div className="heat-wrap">
        <div className="heat-item">
          <StaticPaywall mode={mode} trialEnd={computeTrialEnd()} discId={null} framed={false} />
          <canvas ref={canvas} className="heat-canvas" width={390} height={800} />
        </div>
      </div>
    </div>
  );
}
