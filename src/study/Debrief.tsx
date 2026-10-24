import { shell } from "../studynest/copy";
import { Page } from "./controls";

export function Debrief({ participantId }: { participantId: string }) {
  const c = shell.debrief;
  return (
    <Page eyebrow={c.eyebrow} title={c.title}>
      <p className="lead">{c.intro}</p>
      <ul className="patterns">
        {c.patterns.map(([name, text]) => (
          <li key={name}>
            <strong>{name}:</strong> {text}
          </li>
        ))}
      </ul>
      <p>{c.why}</p>
      <p>{c.safe}</p>
      <section className="panel id-panel">
        <div className="eyebrow">{c.idLabel}</div>
        <div className="pid" data-testid="participant-id">
          {participantId}
        </div>
        <p className="note">{c.removal}</p>
      </section>
    </Page>
  );
}
