import { app } from "../copy";

export function Onboarding({ step, onNext }: { step: 1 | 2; onNext: () => void }) {
  const c = step === 1 ? app.onb1 : app.onb2;
  return (
    <div className="sn-screen onb">
      <div className="onb-art" aria-hidden="true">
        {step === 1 ? (
          <>
            <span className="onb-card w80" />
            <span className="onb-card w60" />
            <span className="onb-card w70" />
          </>
        ) : (
          <>
            <span className="onb-flash back" />
            <span className="onb-flash front" />
          </>
        )}
      </div>
      <div className="onb-text">
        <h1 className="sn-h1">{c.title}</h1>
        <p className="onb-body">{c.body}</p>
      </div>
      <div className="onb-foot">
        <div className="onb-dots" aria-label={`Page ${step} of 2`}>
          <span className={step === 1 ? "on" : ""} />
          <span className={step === 2 ? "on" : ""} />
        </div>
        <button className="sn-btn primary" data-id="onb-continue" onClick={onNext}>
          {c.button}
        </button>
      </div>
    </div>
  );
}
