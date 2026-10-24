import { useState } from "react";
import type { Background as Bg } from "../types";
import { backgroundQuestions as q, shell } from "../studynest/copy";
import { Choice, Page, Scale } from "./controls";

export function Background({ onDone, busy }: { onDone: (bg: Bg) => void; busy: boolean }) {
  const [bg, setBg] = useState<Partial<Bg>>({});
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Bg>(k: K) => (v: Bg[K]) => setBg((b) => ({ ...b, [k]: v }));
  const keys: (keyof Bg)[] = ["own", "years", "safer", "saferConf", "techConf"];
  const complete = keys.every((k) => bg[k] !== undefined);
  const miss = (k: keyof Bg) => tried && bg[k] === undefined;

  return (
    <Page eyebrow={shell.background.eyebrow} title={shell.background.title}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (complete && !busy) onDone(bg as Bg);
        }}
      >
        <Choice name="own" label={q.own.label} options={q.own.options} value={bg.own} onChange={set("own")} missing={miss("own")} />
        <Choice name="years" label={q.years.label} options={q.years.options} value={bg.years} onChange={set("years")} missing={miss("years")} />
        <Choice name="safer" label={q.safer.label} options={q.safer.options} value={bg.safer} onChange={set("safer")} missing={miss("safer")} />
        <Scale name="saferConf" label={q.saferConf.label} low={q.saferConf.low} high={q.saferConf.high} value={bg.saferConf} onChange={set("saferConf")} missing={miss("saferConf")} />
        <Scale name="techConf" label={q.techConf.label} low={q.techConf.low} high={q.techConf.high} value={bg.techConf} onChange={set("techConf")} missing={miss("techConf")} />
        {tried && !complete && (
          <p className="error" role="alert">
            {shell.background.error}
          </p>
        )}
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {shell.background.next}
          </button>
        </div>
      </form>
    </Page>
  );
}
