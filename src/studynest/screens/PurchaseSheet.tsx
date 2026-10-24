import type { Condition, PlanState } from "../../types";
import { app, fullTerms, sheetCommon, sheetIos, sheetMd } from "../copy";

type Props = {
  mode: Condition;
  state: PlanState;
  trialEnd: string;
  detailsOpen: boolean;
  onDetails: () => void;
  onSubscribe: () => void;
  onCancel: () => void;
};

/** Unbranded store-style purchase sheet. Layout follows the platform; the data-ids are shared. */
export function PurchaseSheet({ mode, state, trialEnd, detailsOpen, onDetails, onSubscribe, onCancel }: Props) {
  return (
    <div className="sheet-layer">
      <div className="sheet-scrim" data-id="sheet-scrim" onClick={onCancel} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={sheetCommon.appName}>
        {mode === "ios" ? (
          <IosSheet state={state} trialEnd={trialEnd} detailsOpen={detailsOpen} onDetails={onDetails} onSubscribe={onSubscribe} onCancel={onCancel} />
        ) : (
          <MdSheet state={state} trialEnd={trialEnd} detailsOpen={detailsOpen} onDetails={onDetails} onSubscribe={onSubscribe} onCancel={onCancel} />
        )}
      </div>
    </div>
  );
}

type Inner = Omit<Props, "mode">;

function AppRow({ sub }: { sub: string }) {
  return (
    <div className="sheet-app">
      <div className="sheet-badge" aria-hidden="true">
        {app.badge}
      </div>
      <div>
        <div className="sheet-app-name">{sheetCommon.appName}</div>
        <div className="sheet-app-sub">{sub}</div>
      </div>
    </div>
  );
}

function Details({ open, onClick, text }: { open: boolean; onClick: () => void; text: string }) {
  return (
    <>
      <button className="sheet-link" data-id="sheet-details" aria-expanded={open} onClick={onClick}>
        {sheetCommon.viewDetails}
      </button>
      {open && <p className="sheet-terms">{text}</p>}
    </>
  );
}

function IosSheet({ state, trialEnd, detailsOpen, onDetails, onSubscribe, onCancel }: Inner) {
  const [priceSmall, priceBig] = sheetIos.price(state, trialEnd);
  return (
    <>
      <div className="sheet-head">
        <span className="sheet-head-title">{sheetIos.header}</span>
        <button className="sheet-cancel-link" data-id="sheet-cancel" onClick={onCancel}>
          {sheetCommon.cancel}
        </button>
      </div>
      <AppRow sub={sheetIos.appSub} />
      <div className="sheet-rows">
        <div className="sheet-row">
          <span className="sheet-label">{sheetIos.labels.policy}</span>
          <span className="sheet-val">{sheetIos.policy(state)}</span>
        </div>
        {state.plan === "annual" && (
          <div className="sheet-row">
            <span className="sheet-label">{sheetIos.labels.trial}</span>
            <span className="sheet-val big">{sheetIos.trial}</span>
          </div>
        )}
        <div className="sheet-row">
          <span className="sheet-label">{sheetIos.labels.price}</span>
          <span className="sheet-val">
            {priceSmall && <span className="sheet-small">{priceSmall}</span>}
            <span className="big">{priceBig}</span>
          </span>
        </div>
      </div>
      <Details open={detailsOpen} onClick={onDetails} text={fullTerms(state, trialEnd)} />
      <div className="sheet-actions">
        <button className="sheet-subscribe" data-id="sheet-subscribe" onClick={onSubscribe}>
          {sheetCommon.subscribe}
        </button>
      </div>
    </>
  );
}

function MdSheet({ state, trialEnd, detailsOpen, onDetails, onSubscribe, onCancel }: Inner) {
  return (
    <>
      <div className="sheet-handle" aria-hidden="true" />
      <AppRow sub={sheetMd.appSub} />
      <ol className="sheet-timeline">
        {sheetMd.timeline(state, trialEnd).map(([l, r]) => (
          <li key={l}>
            <span className="tl-dot" aria-hidden="true" />
            <span className="tl-left">{l}</span>
            <span className="tl-right">{r}</span>
          </li>
        ))}
      </ol>
      <ul className="sheet-bullets">
        {sheetMd.bullets(state, trialEnd).map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <Details open={detailsOpen} onClick={onDetails} text={fullTerms(state, trialEnd)} />
      <div className="sheet-actions">
        <button className="sheet-subscribe" data-id="sheet-subscribe" onClick={onSubscribe}>
          {sheetCommon.subscribe}
        </button>
        <button className="sheet-cancel-text" data-id="sheet-cancel" onClick={onCancel}>
          {sheetCommon.cancel}
        </button>
      </div>
    </>
  );
}
