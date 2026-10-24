import { useCallback, useEffect, useRef } from "react";
import type { Logger } from "../../lib/logger";
import type { Plan, PlanState } from "../../types";
import { app, ctaText, disclosureText } from "../copy";
import { Check } from "../icons";

type Props = {
  state: PlanState;
  trialEnd: string;
  /** Logger for disclosure visibility + scroll depth; omit for static renders. */
  logger?: Logger;
  sheetOpen?: boolean;
  /** id of the disclosure element; the equivalence check renders two paywalls, so it passes null. */
  discId?: string | null;
  onClose?: () => void;
  onPlan?: (p: Plan) => void;
  onToggleRenew?: () => void;
  onCta?: () => void;
  onDecline?: () => void;
};

const noop = () => {};

/**
 * The paywall (§5.3). Identical structure, text and deceptive-element styling in both modes;
 * platform styling comes only from the `.ios` / `.md` class on the enclosing `.sn-app`.
 */
export function Paywall({
  state,
  trialEnd,
  logger,
  sheetOpen = false,
  discId = "pw-disc",
  onClose = noop,
  onPlan = noop,
  onToggleRenew = noop,
  onCta = noop,
  onDecline = noop,
}: Props) {
  const p = app.paywall;
  const scrollRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLParagraphElement>(null);
  // Disclosure timer runs while ≥ 50% visible, the sheet is closed and the page is visible.
  const vis = useRef({ ratioOk: false, sheet: sheetOpen, hidden: typeof document !== "undefined" && document.hidden, on: false });

  const sync = useCallback(() => {
    if (!logger) return;
    const v = vis.current;
    const want = v.ratioOk && !v.sheet && !v.hidden;
    if (want !== v.on) {
      v.on = want;
      logger.log(want ? "disclosure_visible" : "disclosure_hidden", {}, "paywall");
    }
  }, [logger]);

  const measureScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!logger || !el || el.scrollHeight === 0) return;
    logger.scrollDepth(((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100);
  }, [logger]);

  useEffect(() => {
    if (!logger || !discRef.current || !scrollRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) vis.current.ratioOk = e.isIntersecting && e.intersectionRatio >= 0.5;
        sync();
      },
      { root: scrollRef.current, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    io.observe(discRef.current);
    const onVis = () => {
      vis.current.hidden = document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);
    measureScroll();
    const v = vis.current;
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (v.on) {
        v.on = false;
        logger.log("disclosure_hidden", {}, "paywall");
      }
    };
  }, [logger, sync, measureScroll]);

  useEffect(() => {
    vis.current.sheet = sheetOpen;
    sync();
  }, [sheetOpen, sync]);

  const annual = state.plan === "annual";

  return (
    <div className="sn-screen pw" data-testid="paywall">
      <button className="pw-close" data-id="pw-close" aria-label="Close" onClick={onClose}>
        {p.close}
      </button>
      <div className="pw-scroll" ref={scrollRef} onScroll={measureScroll}>
        <div className="pw-col">
          <div className="pw-hero">
            <div className="pw-badge" aria-hidden="true">
              {app.badge}
            </div>
            <h1 className="pw-title">{p.heading}</h1>
          </div>

          <ul className="pw-benefits">
            {p.benefits.map((b) => (
              <li key={b}>
                <span className="pw-tick" aria-hidden="true">
                  <Check size={14} />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="pw-plans" role="radiogroup" aria-label="Plan">
            <PlanCard id="plan-annual" selected={annual} name={p.yearly.name} meta={p.yearly.meta} tag={p.yearly.tag} onClick={() => onPlan("annual")} />
            <PlanCard id="plan-monthly" selected={!annual} name={p.monthly.name} meta={p.monthly.meta} onClick={() => onPlan("monthly")} />
          </div>

          {annual && (
            <button
              className="pw-check-row"
              role="checkbox"
              aria-checked={state.autoRenew}
              data-id="autorenew"
              onClick={onToggleRenew}
            >
              <span className={`pw-box ${state.autoRenew ? "on" : ""}`} aria-hidden="true">
                {state.autoRenew && <Check size={12} color="#fff" />}
              </span>
              <span className="pw-check">{p.checkbox}</span>
            </button>
          )}

          <button className="pw-cta" data-id="pw-cta" onClick={onCta}>
            {ctaText(state)}
          </button>

          <p className="disc" id={discId ?? undefined} ref={discRef}>
            {disclosureText(state, trialEnd)}
          </p>

          <button className="pw-decline" data-id="pw-decline" onClick={onDecline}>
            {p.decline}
          </button>

          <p className="pw-legal">{p.legal}</p>
        </div>
      </div>
    </div>
  );
}

function PlanCard(props: { id: string; selected: boolean; name: string; meta: string; tag?: string; onClick: () => void }) {
  return (
    <button
      className={`pw-plan ${props.selected ? "sel" : ""}`}
      role="radio"
      aria-checked={props.selected}
      data-id={props.id}
      onClick={props.onClick}
    >
      <span className="pw-radio" aria-hidden="true">
        <span className="pw-radio-mark">
          <Check size={12} color="#fff" />
        </span>
      </span>
      <span className="pw-plan-text">
        <span className="pw-plan-name">{props.name}</span>
        <span className="pw-plan-meta">{props.meta}</span>
      </span>
      {props.tag && <span className="pw-tag">{props.tag}</span>}
    </button>
  );
}
