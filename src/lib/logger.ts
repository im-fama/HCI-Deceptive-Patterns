import type { AppScreen, EventType, LogEvent } from "../types";

type Extra = Omit<LogEvent, "t" | "type" | "screen">;

/**
 * Event log for one StudyNest run. Time is ms since app_start (performance.now based).
 * A logger created with `enabled = false` (static/debug renders) records nothing.
 */
export class Logger {
  readonly events: LogEvent[] = [];
  screen: AppScreen = "onb1";
  private t0 = performance.now();
  private firstDecisionLogged = false;
  private maxScroll = -1;

  constructor(public enabled = true) {}

  now(): number {
    return Math.round(performance.now() - this.t0);
  }

  log(type: EventType, extra: Extra = {}, screen: AppScreen = this.screen): void {
    if (!this.enabled) return;
    this.events.push({ t: this.now(), type, screen, ...extra });
  }

  start(extra: Extra): void {
    this.t0 = performance.now();
    this.log("app_start", extra);
  }

  enter(screen: AppScreen): void {
    this.screen = screen;
    this.log("screen_enter");
  }

  /** first_decision: first tap on CTA, decline or close; ms since first paywall render. */
  firstDecision(kind: "cta" | "decline" | "close"): void {
    if (this.firstDecisionLogged) return;
    const enter = this.events.find((e) => e.type === "screen_enter" && e.screen === "paywall");
    this.firstDecisionLogged = true;
    this.log("first_decision", { kind, ms: enter ? this.now() - enter.t : undefined });
  }

  /** Logs a `scroll` event only when the paywall's max scroll depth increases. */
  scrollDepth(pct: number): void {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (p <= this.maxScroll) return;
    this.maxScroll = p;
    this.log("scroll", { pct: p }, "paywall");
  }
}

export const NULL_LOGGER = new Logger(false);
