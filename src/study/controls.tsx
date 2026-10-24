import type { ReactNode } from "react";

/** Single-choice question rendered as labelled radio chips. */
export function Choice<V extends string>(props: {
  name: string;
  label: ReactNode;
  options: { value: V; label: string }[];
  value: V | undefined;
  onChange: (v: V) => void;
  missing?: boolean;
}) {
  return (
    <fieldset className={`q ${props.missing ? "missing" : ""}`}>
      <legend className="q-label">{props.label}</legend>
      <div className="chips">
        {props.options.map((o) => (
          <label key={o.value} className={`chip ${props.value === o.value ? "on" : ""}`}>
            <input
              type="radio"
              name={props.name}
              value={o.value}
              checked={props.value === o.value}
              onChange={() => props.onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** 1–7 rating scale with labelled endpoints. */
export function Scale(props: {
  name: string;
  label: ReactNode;
  low: string;
  high: string;
  value: number | undefined;
  onChange: (v: number) => void;
  missing?: boolean;
}) {
  return (
    <fieldset className={`q ${props.missing ? "missing" : ""}`}>
      <legend className="q-label">{props.label}</legend>
      <div className="scale">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <label key={n} className={`scale-pt ${props.value === n ? "on" : ""}`}>
            <input type="radio" name={props.name} value={n} checked={props.value === n} onChange={() => props.onChange(n)} />
            <span aria-label={n === 1 ? `1, ${props.low}` : n === 7 ? `7, ${props.high}` : String(n)}>{n}</span>
          </label>
        ))}
      </div>
      <div className="scale-ends" aria-hidden="true">
        <span>{props.low}</span>
        <span>{props.high}</span>
      </div>
    </fieldset>
  );
}

export function TextQ(props: {
  id: string;
  label: ReactNode;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  missing?: boolean;
}) {
  return (
    <div className={`q ${props.missing ? "missing" : ""}`}>
      <label className="q-label" htmlFor={props.id}>
        {props.label}
      </label>
      {props.hint && <div className="q-hint">{props.hint}</div>}
      <textarea id={props.id} rows={3} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

export function Page({ eyebrow, title, children }: { eyebrow: ReactNode; title?: ReactNode; children: ReactNode }) {
  return (
    <main className="page">
      <div className="eyebrow">{eyebrow}</div>
      {title && <h1 className="title">{title}</h1>}
      {children}
    </main>
  );
}
