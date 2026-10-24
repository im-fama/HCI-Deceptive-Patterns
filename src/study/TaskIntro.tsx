import { shell } from "../studynest/copy";
import { Page } from "./controls";

export function TaskIntro({ participantId, onOpen }: { participantId: string; onOpen: () => void }) {
  const c = shell.task;
  return (
    <Page eyebrow={<span className="mono">{participantId}</span>} title={c.title}>
      <div className="task-card">{c.card}</div>
      <p className="note">
        {c.notePre}
        <strong>{c.noteDone}</strong>
        {c.notePost}
      </p>
      <div className="actions">
        <button className="btn primary" onClick={onOpen}>
          {c.open}
        </button>
      </div>
    </Page>
  );
}
