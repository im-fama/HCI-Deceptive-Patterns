import { useState } from "react";
import { shell } from "../studynest/copy";
import { Page } from "./controls";

export function Consent({ onAgree, onBack }: { onAgree: () => void; onBack: () => void }) {
  const c = shell.consent;
  const [ticked, setTicked] = useState(c.items.map(() => false));
  const all = ticked.every(Boolean);
  return (
    <Page eyebrow={c.eyebrow} title={c.title}>
      <div className="checks">
        {c.items.map((item, i) => (
          <label key={item} className={`check ${ticked[i] ? "on" : ""}`}>
            <input
              type="checkbox"
              checked={ticked[i]}
              onChange={(e) => setTicked(ticked.map((t, j) => (j === i ? e.target.checked : t)))}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <p className="note">{c.note}</p>
      <div className="actions">
        <button className="btn primary" disabled={!all} onClick={onAgree}>
          {c.agree}
        </button>
        <button className="btn ghost" onClick={onBack}>
          {c.back}
        </button>
      </div>
    </Page>
  );
}
