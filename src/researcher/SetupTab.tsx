import { useEffect, useState } from "react";
import { deleteLocalSessions, getSettings, localSessions, resetBlocks, saveSettings } from "../lib/storage";
import type { Condition, ForceSetting, Settings } from "../types";

type Props = { onQuickDemo: (c: Condition) => void; onSettings: (s: Settings) => void };

export function SetupTab({ onQuickDemo, onSettings }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localCount, setLocalCount] = useState(() => localSessions().length);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  async function update(patch: Partial<Settings>) {
    const next = { ...settings!, ...patch };
    setSettings(next);
    onSettings(next);
    const err = await saveSettings(next);
    setMsg(err ? `Saved locally; Firestore write failed: ${err}` : "Settings saved.");
  }

  if (!settings) return <p className="status-msg">Loading settings…</p>;

  const force: [ForceSetting, string][] = [
    ["auto", "Automatic"],
    ["ios", "Always iOS style"],
    ["md", "Always Android style"],
  ];

  return (
    <section className="panel">
      <div className="setting">
        <div>
          <div className="setting-name">Condition assignment</div>
          <div className="setting-desc">Automatic = stratified block randomisation by own phone. Forced sessions are recorded as "forced".</div>
        </div>
        <div className="seg" role="group" aria-label="Condition assignment">
          {force.map(([v, label]) => (
            <button key={v} aria-pressed={settings.force === v} onClick={() => update({ force: v })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting">
        <div>
          <div className="setting-name">Demo mode</div>
          <div className="setting-desc">When on, new sessions are marked demo and excluded from results.</div>
        </div>
        <div className="seg" role="group" aria-label="Demo mode">
          <button aria-pressed={!settings.demoMode} onClick={() => update({ demoMode: false })}>
            Off
          </button>
          <button aria-pressed={settings.demoMode} onClick={() => update({ demoMode: true })}>
            On
          </button>
        </div>
      </div>

      <div className="setting">
        <div>
          <div className="setting-name">Quick demo</div>
          <div className="setting-desc">Skips consent and background questions and goes straight to the task. Recorded as demo.</div>
        </div>
        <div className="toolbar" style={{ margin: 0 }}>
          <button className="btn ghost sm" onClick={() => onQuickDemo("ios")}>
            Run iOS version
          </button>
          <button className="btn ghost sm" onClick={() => onQuickDemo("md")}>
            Run Android version
          </button>
        </div>
      </div>

      <div className="setting">
        <div>
          <div className="setting-name">Assignment queues</div>
          <div className="setting-desc">Clears the per-stratum block queues (local and Firestore).</div>
        </div>
        <button
          className="btn ghost sm"
          onClick={async () => {
            const err = await resetBlocks();
            setMsg(err ? `Local queues reset; Firestore failed: ${err}` : "Assignment queues reset.");
          }}
        >
          Reset queues
        </button>
      </div>

      <div className="setting">
        <div>
          <div className="setting-name">Local sessions</div>
          <div className="setting-desc">{localCount} session(s) stored in this browser. Firestore data is not affected.</div>
        </div>
        {confirmDelete ? (
          <div className="toolbar" style={{ margin: 0 }}>
            <span className="status-msg">Delete all {localCount} local sessions?</span>
            <button
              className="btn danger sm"
              onClick={() => {
                deleteLocalSessions();
                setLocalCount(0);
                setConfirmDelete(false);
                setMsg("Local sessions deleted.");
              }}
            >
              Yes, delete
            </button>
            <button className="btn ghost sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn danger sm" onClick={() => setConfirmDelete(true)} disabled={localCount === 0}>
            Delete local sessions
          </button>
        )}
      </div>

      {msg && (
        <p className="status-msg" role="status" style={{ marginTop: 12 }}>
          {msg}
        </p>
      )}
    </section>
  );
}
