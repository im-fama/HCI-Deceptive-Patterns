import type { PlanState } from "../../types";
import { app, plusChargeLine } from "../copy";
import { Check } from "../icons";

export function PlusActive({ state, trialEnd, onDone }: { state: PlanState; trialEnd: string; onDone: () => void }) {
  return (
    <div className="sn-screen plus">
      <div className="plus-body">
        <div className="plus-badge" aria-hidden="true">
          <Check size={30} color="#fff" />
        </div>
        <h1 className="sn-h1">{app.plus.title}</h1>
        <p className="plus-text">{app.plus.body}</p>
        <p className="plus-charge">{plusChargeLine(state, trialEnd)}</p>
      </div>
      <div className="plus-foot">
        <button className="sn-btn primary" data-id="finish" onClick={onDone}>
          {app.plus.done}
        </button>
      </div>
    </div>
  );
}
