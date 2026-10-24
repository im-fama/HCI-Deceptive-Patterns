import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Logger } from "../lib/logger";
import type { AppScreen, Condition, LogEvent, Outcome, Plan, PlanState } from "../types";
import { subscribeOutcome } from "./copy";
import { DeviceFrame } from "./DeviceFrame";
import { Home } from "./screens/Home";
import { Onboarding } from "./screens/Onboarding";
import { Paywall } from "./screens/Paywall";
import { PlusActive } from "./screens/PlusActive";
import { PurchaseSheet } from "./screens/PurchaseSheet";
import "../styles/app-common.css";
import "../styles/app-ios.css";
import "../styles/app-md.css";

type Props = {
  mode: Condition;
  logger: Logger;
  trialEnd: string;
  onDone: (events: LogEvent[]) => void;
};

const DEFAULT_STATE: PlanState = { plan: "annual", autoRenew: true };

const round3 = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;

/** The fictional StudyNest app. One component tree for both conditions; `mode` only switches styling. */
export function StudyNestApp({ mode, logger, trialEnd, onDone }: Props) {
  const [screen, setScreen] = useState<AppScreen>("onb1");
  const [state, setState] = useState<PlanState>(DEFAULT_STATE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("none");
  const frameRef = useRef<HTMLDivElement>(null);
  const ended = useRef(false);

  useEffect(() => {
    if (logger.events.length === 0) logger.start({ condition: mode, viewport: [window.innerWidth, window.innerHeight] });
    const onVis = () => logger.log(document.hidden ? "page_hidden" : "page_visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [logger, mode]);

  useEffect(() => {
    const last = [...logger.events].reverse().find((e) => e.type === "screen_enter");
    if (last?.screen !== screen) logger.enter(screen);
  }, [screen, logger]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    const target = (e.target as Element).closest?.("[data-id]")?.getAttribute("data-id") ?? null;
    logger.log("tap", { x: round3((e.clientX - r.left) / r.width), y: round3((e.clientY - r.top) / r.height), target });
  }

  const setPlan = (plan: Plan) => {
    if (plan === state.plan) return;
    logger.log("plan_change", { plan });
    setState({ ...state, plan });
  };

  const toggleRenew = () => {
    const on = !state.autoRenew;
    logger.log("autorenew_toggle", { on });
    setState({ ...state, autoRenew: on });
  };

  const openSheet = () => {
    logger.firstDecision("cta");
    logger.log("sheet_open", { plan: state.plan, on: state.autoRenew });
    setDetailsOpen(false);
    setSheetOpen(true);
  };

  const cancelSheet = () => {
    logger.log("sheet_close", { how: "cancel" });
    setSheetOpen(false);
  };

  const subscribe = () => {
    const out = subscribeOutcome(state);
    logger.log("sheet_close", { how: "subscribe" });
    logger.log("subscribed", { outcome: out, plan: state.plan, on: state.autoRenew });
    setOutcome(out);
    setSheetOpen(false);
    setScreen("plus");
  };

  const decline = () => {
    logger.firstDecision("decline");
    logger.log("declined", { outcome: "declined" });
    setOutcome("declined");
    setScreen("home");
  };

  const close = () => {
    logger.firstDecision("close");
    logger.log("closed_paywall", { outcome: "closed" });
    setOutcome("closed");
    setScreen("home");
  };

  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    logger.log("task_end");
    onDone(logger.events);
  };

  const plusActive = outcome === "trial_autorenew" || outcome === "trial_no_renew" || outcome === "paid_monthly";

  return (
    <DeviceFrame ref={frameRef} mode={mode} screen={screen} onPointerDownCapture={onPointerDown}>
      {screen === "onb1" && <Onboarding step={1} onNext={() => setScreen("onb2")} />}
      {screen === "onb2" && <Onboarding step={2} onNext={() => setScreen("home")} />}
      {screen === "home" && (
        <Home
          mode={mode}
          plusActive={plusActive}
          freePlan={outcome === "declined" || outcome === "closed"}
          onDeck={(deck) => logger.log("deck_tap", { deck })}
          onLocked={() => !plusActive && setScreen("paywall")}
          onDone={finish}
        />
      )}
      {screen === "paywall" && (
        <>
          <Paywall
            state={state}
            trialEnd={trialEnd}
            logger={logger}
            sheetOpen={sheetOpen}
            onClose={close}
            onPlan={setPlan}
            onToggleRenew={toggleRenew}
            onCta={openSheet}
            onDecline={decline}
          />
          {sheetOpen && (
            <PurchaseSheet
              mode={mode}
              state={state}
              trialEnd={trialEnd}
              detailsOpen={detailsOpen}
              onDetails={() => {
                logger.log("view_details");
                setDetailsOpen((o) => !o);
              }}
              onSubscribe={subscribe}
              onCancel={cancelSheet}
            />
          )}
        </>
      )}
      {screen === "plus" && <PlusActive state={state} trialEnd={trialEnd} onDone={finish} />}
    </DeviceFrame>
  );
}

/** Paywall in its default state with no logging, for the equivalence check and screenshots. */
export function StaticPaywall({ mode, trialEnd, discId = "pw-disc", framed = true }: { mode: Condition; trialEnd: string; discId?: string | null; framed?: boolean }) {
  const pw = <Paywall state={DEFAULT_STATE} trialEnd={trialEnd} discId={discId} />;
  if (framed) return <DeviceFrame mode={mode}>{pw}</DeviceFrame>;
  return (
    <div className={`sn-app sn-static ${mode}`} data-mode={mode}>
      <div className="sn-viewport">{pw}</div>
    </div>
  );
}
