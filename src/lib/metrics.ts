// Derived metrics (§7.4). Pure functions of the event list so they can be
// unit-tested and re-computed in Python (analysis/load_data.py mirrors this).
import type { LogEvent, Metrics, Outcome } from "../types";

const SUSCEPTIBLE: Outcome[] = ["trial_autorenew", "paid_monthly"];
const DECISION_TARGETS = new Set(["pw-cta", "pw-decline", "pw-close"]);

function endTime(events: LogEvent[]): number {
  const end = events.find((e) => e.type === "task_end");
  return end ? end.t : events.length ? events[events.length - 1].t : 0;
}

export function outcomeOf(events: LogEvent[]): Outcome {
  let out: Outcome = "none";
  for (const e of events) {
    if (e.type === "subscribed" && e.outcome) out = e.outcome as Outcome;
    else if (e.type === "declined") out = "declined";
    else if (e.type === "closed_paywall") out = "closed";
  }
  return out;
}

/** Sum of [start, stop) intervals; an unclosed interval ends at the end of the task. */
function pairedDuration(events: LogEvent[], start: (e: LogEvent) => boolean, stop: (e: LogEvent) => boolean): number {
  let total = 0;
  let open: number | null = null;
  for (const e of events) {
    if (open === null && start(e)) open = e.t;
    else if (open !== null && stop(e)) {
      total += e.t - open;
      open = null;
    }
  }
  if (open !== null) total += Math.max(0, endTime(events) - open);
  return total;
}

export function paywallDwell(events: LogEvent[]): number {
  return pairedDuration(
    events,
    (e) => e.type === "screen_enter" && e.screen === "paywall",
    (e) => (e.type === "screen_enter" && e.screen !== "paywall") || e.type === "task_end",
  );
}

export function decisionLatency(events: LogEvent[]): number | null {
  const first = events.find((e) => e.type === "screen_enter" && e.screen === "paywall");
  if (!first) return null;
  const tap = events.find(
    (e) =>
      e.type === "tap" && e.screen === "paywall" && e.t >= first.t && e.target != null && DECISION_TARGETS.has(e.target),
  );
  return tap ? tap.t - first.t : null;
}

export function computeMetrics(events: LogEvent[]): Metrics {
  const count = (type: LogEvent["type"]) => events.filter((e) => e.type === type).length;
  const outcome = outcomeOf(events);
  const start = events.find((e) => e.type === "app_start");
  const end = events.find((e) => e.type === "task_end");
  const scrolls = events.filter((e) => e.type === "scroll" && typeof e.pct === "number").map((e) => e.pct as number);
  return {
    outcome,
    susceptible: SUSCEPTIBLE.includes(outcome),
    paywall_dwell_ms: paywallDwell(events),
    decision_latency_ms: decisionLatency(events),
    disclosure_visible_ms: pairedDuration(
      events,
      (e) => e.type === "disclosure_visible",
      (e) => e.type === "disclosure_hidden",
    ),
    view_details_taps: count("view_details"),
    sheet_dwell_ms: pairedDuration(
      events,
      (e) => e.type === "sheet_open",
      (e) => e.type === "sheet_close",
    ),
    sheet_opens: count("sheet_open"),
    autorenew_toggles: count("autorenew_toggle"),
    plan_changes: count("plan_change"),
    paywall_max_scroll_pct: scrolls.length ? Math.round(Math.min(100, Math.max(...scrolls))) : 0,
    task_total_ms: start && end ? end.t - start.t : 0,
  };
}
