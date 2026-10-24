import { isMobile } from "../lib/device";
import { shell } from "../studynest/copy";
import { Page } from "./controls";

export function Welcome({ onStart, onResearcher }: { onStart: () => void; onResearcher: () => void }) {
  const c = shell.welcome;
  return (
    <Page eyebrow={c.eyebrow} title={c.title}>
      <p className="lead">{c.text}</p>
      <section className="panel">
        <h2 className="panel-title">{c.panelTitle}</h2>
        <ol className="steps">
          {c.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
      <p className="note">{c.note}</p>
      {!isMobile() && <p className="note warn">{c.desktop}</p>}
      <div className="actions">
        <button className="btn primary" onClick={onStart}>
          {c.start}
        </button>
      </div>
      <footer className="foot">
        <button className="link small" onClick={onResearcher}>
          {c.research}
        </button>
      </footer>
    </Page>
  );
}
