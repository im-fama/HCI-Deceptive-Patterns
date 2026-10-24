import { useState } from "react";
import type { Post } from "../types";
import { postQuestions as q, shell, trustItems } from "../studynest/copy";
import { Choice, Page, Scale, TextQ } from "./controls";

const REQUIRED: (keyof Post)[] = ["t1", "t2", "t3", "t4", "t5", "recall1", "recall2", "misleading", "manip", "familiar"];

export function PostQuestionnaire({ onDone, busy }: { onDone: (p: Post) => void; busy: boolean }) {
  const [p, setP] = useState<Partial<Post>>({ recall1: "", recall2: "", misleadingWhat: "" });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Post>(k: K) => (v: Post[K]) => setP((x) => ({ ...x, [k]: v }));
  const filled = (k: keyof Post) => {
    const v = p[k];
    return typeof v === "string" ? v.trim().length > 0 : v !== undefined;
  };
  const complete = REQUIRED.every(filled);
  const miss = (k: keyof Post) => tried && !filled(k);
  const c = shell.post;

  return (
    <Page eyebrow={c.eyebrow} title={c.title}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (complete && !busy) onDone({ ...(p as Post), recall1: p.recall1!.trim(), recall2: p.recall2!.trim(), misleadingWhat: (p.misleadingWhat ?? "").trim() });
        }}
      >
        <section className="panel">
          <h2 className="panel-title">{c.trustTitle}</h2>
          {trustItems.map(([k, label]) => (
            <Scale key={k} name={k} label={label} low={q.trustScale.low} high={q.trustScale.high} value={p[k]} onChange={set(k)} missing={miss(k)} />
          ))}
        </section>

        <section className="panel">
          <h2 className="panel-title">{c.recallTitle}</h2>
          <TextQ id="recall1" label={q.recall1} hint={q.recallHint} value={p.recall1 ?? ""} onChange={set("recall1")} missing={miss("recall1")} />
          <TextQ id="recall2" label={q.recall2} hint={q.recallHint} value={p.recall2 ?? ""} onChange={set("recall2")} missing={miss("recall2")} />
        </section>

        <section className="panel">
          <h2 className="panel-title">{c.lastTitle}</h2>
          <Choice name="misleading" label={q.misleading.label} options={q.misleading.options} value={p.misleading} onChange={set("misleading")} missing={miss("misleading")} />
          <TextQ id="misleadingWhat" label={q.misleadingWhat} value={p.misleadingWhat ?? ""} onChange={set("misleadingWhat")} />
          <Choice name="manip" label={q.manip.label} options={q.manip.options} value={p.manip} onChange={set("manip")} missing={miss("manip")} />
          <Scale name="familiar" label={q.familiar.label} low={q.familiar.low} high={q.familiar.high} value={p.familiar} onChange={set("familiar")} missing={miss("familiar")} />
        </section>

        {tried && !complete && (
          <p className="error" role="alert">
            {c.error}
          </p>
        )}
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {c.submit}
          </button>
        </div>
      </form>
    </Page>
  );
}
