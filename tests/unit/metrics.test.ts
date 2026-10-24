import { describe, expect, it } from "vitest";
import { computeMetrics } from "../../src/lib/metrics";
import type { LogEvent } from "../../src/types";

const E = (t: number, type: LogEvent["type"], screen: LogEvent["screen"], extra: Partial<LogEvent> = {}): LogEvent => ({
  t,
  type,
  screen,
  ...extra,
});

// Opens the sheet twice (viewing details twice), cancels once, then subscribes with defaults.
const events: LogEvent[] = [
  E(0, "app_start", "onb1", { condition: "ios", viewport: [390, 844] }),
  E(0, "screen_enter", "onb1"),
  E(1000, "screen_enter", "onb2"),
  E(2000, "screen_enter", "home"),
  E(2500, "tap", "home", { target: "deck-biology", x: 0.5, y: 0.3 }),
  E(2500, "deck_tap", "home", { deck: "biology" }),
  E(3000, "tap", "home", { target: "locked-tests", x: 0.5, y: 0.6 }),
  E(3010, "screen_enter", "paywall"),
  E(3020, "scroll", "paywall", { pct: 80 }),
  E(3050, "disclosure_visible", "paywall"),
  E(4000, "plan_change", "paywall", { plan: "monthly" }),
  E(4500, "plan_change", "paywall", { plan: "annual" }),
  E(5000, "autorenew_toggle", "paywall", { on: false }),
  E(6000, "tap", "paywall", { target: "pw-cta", x: 0.5, y: 0.7 }),
  E(6000, "first_decision", "paywall", { kind: "cta", ms: 2990 }),
  E(6005, "sheet_open", "paywall", { plan: "annual", on: false }),
  E(6005, "disclosure_hidden", "paywall"),
  E(7000, "view_details", "paywall"),
  E(7500, "view_details", "paywall"),
  E(8000, "sheet_close", "paywall", { how: "cancel" }),
  E(8000, "disclosure_visible", "paywall"),
  E(8500, "scroll", "paywall", { pct: 100 }),
  E(9000, "autorenew_toggle", "paywall", { on: true }),
  E(9400, "tap", "paywall", { target: "pw-cta", x: 0.5, y: 0.7 }),
  E(9500, "sheet_open", "paywall", { plan: "annual", on: true }),
  E(9500, "disclosure_hidden", "paywall"),
  E(10500, "sheet_close", "paywall", { how: "subscribe" }),
  E(10500, "subscribed", "paywall", { outcome: "trial_autorenew", plan: "annual", on: true }),
  E(10510, "screen_enter", "plus"),
  E(12000, "tap", "plus", { target: "finish", x: 0.5, y: 0.9 }),
  E(12000, "task_end", "plus"),
];

describe("computeMetrics", () => {
  it("derives every §7.4 metric exactly", () => {
    expect(computeMetrics(events)).toEqual({
      outcome: "trial_autorenew",
      susceptible: true,
      paywall_dwell_ms: 7500,
      decision_latency_ms: 2990,
      disclosure_visible_ms: 2955 + 1500,
      view_details_taps: 2,
      sheet_dwell_ms: 1995 + 1000,
      sheet_opens: 2,
      autorenew_toggles: 2,
      plan_changes: 2,
      paywall_max_scroll_pct: 100,
      task_total_ms: 12000,
    });
  });

  it("handles decline, two paywall visits and an unclosed disclosure interval", () => {
    const ev: LogEvent[] = [
      E(0, "app_start", "onb1"),
      E(0, "screen_enter", "home"),
      E(1000, "screen_enter", "paywall"),
      E(1100, "disclosure_visible", "paywall"),
      E(3000, "tap", "paywall", { target: "pw-close" }),
      E(3000, "closed_paywall", "paywall", { outcome: "closed" }),
      E(3000, "disclosure_hidden", "paywall"),
      E(3001, "screen_enter", "home"),
      E(4000, "screen_enter", "paywall"),
      E(4100, "disclosure_visible", "paywall"),
      E(5000, "tap", "paywall", { target: "pw-decline" }),
      E(5000, "declined", "paywall", { outcome: "declined" }),
      E(5000, "screen_enter", "home"),
      E(6000, "task_end", "home"),
    ];
    const m = computeMetrics(ev);
    expect(m.outcome).toBe("declined");
    expect(m.susceptible).toBe(false);
    expect(m.paywall_dwell_ms).toBe(2001 + 1000);
    expect(m.decision_latency_ms).toBe(2000);
    expect(m.disclosure_visible_ms).toBe(1900 + (6000 - 4100));
    expect(m.paywall_max_scroll_pct).toBe(0);
    expect(m.sheet_opens).toBe(0);
  });

  it("monthly subscription is susceptible; no paywall gives null latency", () => {
    expect(computeMetrics([E(0, "app_start", "onb1"), E(5, "subscribed", "paywall", { outcome: "paid_monthly" })]).susceptible).toBe(true);
    const none = computeMetrics([E(0, "app_start", "onb1"), E(10, "task_end", "home")]);
    expect(none.outcome).toBe("none");
    expect(none.decision_latency_ms).toBeNull();
    expect(none.task_total_ms).toBe(10);
  });
});
