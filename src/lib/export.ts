import type { Session } from "../types";

export const CSV_COLUMNS = [
  "id",
  "started",
  "demo",
  "status",
  "condition",
  "assignment",
  "own_platform",
  "years",
  "believes_safer",
  "safer_conf",
  "tech_conf",
  "mobile",
  "outcome",
  "susceptible",
  "paywall_dwell_ms",
  "decision_latency_ms",
  "disclosure_visible_ms",
  "view_details_taps",
  "sheet_dwell_ms",
  "autorenew_toggles",
  "plan_changes",
  "paywall_max_scroll_pct",
  "task_total_ms",
  "trust_mean",
  "t1",
  "t2",
  "t3",
  "t4",
  "t5",
  "recall1",
  "recall2",
  "misleading",
  "misleading_what",
  "manip_check",
  "manip_pass",
  "familiar",
] as const;

export type CsvRow = Record<(typeof CSV_COLUMNS)[number], string | number | boolean | null | undefined>;

export function trustMean(s: Session): number | null {
  const p = s.post;
  if (!p) return null;
  return Math.round(((p.t1 + p.t2 + p.t3 + p.t4 + p.t5) / 5) * 100) / 100;
}

export function manipPass(s: Session): boolean | null {
  if (!s.post || !s.condition) return null;
  return (s.post.manip === "ios" && s.condition === "ios") || (s.post.manip === "android" && s.condition === "md");
}

export function sessionToRow(s: Session): CsvRow {
  const m = s.metrics;
  const p = s.post;
  return {
    id: s.id,
    started: s.startedAt,
    demo: s.demo,
    status: s.status,
    condition: s.condition,
    assignment: s.assignment,
    own_platform: s.bg?.own,
    years: s.bg?.years,
    believes_safer: s.bg?.safer,
    safer_conf: s.bg?.saferConf,
    tech_conf: s.bg?.techConf,
    mobile: s.mobile,
    outcome: m?.outcome,
    susceptible: m?.susceptible,
    paywall_dwell_ms: m?.paywall_dwell_ms,
    decision_latency_ms: m?.decision_latency_ms,
    disclosure_visible_ms: m?.disclosure_visible_ms,
    view_details_taps: m?.view_details_taps,
    sheet_dwell_ms: m?.sheet_dwell_ms,
    autorenew_toggles: m?.autorenew_toggles,
    plan_changes: m?.plan_changes,
    paywall_max_scroll_pct: m?.paywall_max_scroll_pct,
    task_total_ms: m?.task_total_ms,
    trust_mean: trustMean(s),
    t1: p?.t1,
    t2: p?.t2,
    t3: p?.t3,
    t4: p?.t4,
    t5: p?.t5,
    recall1: p?.recall1,
    recall2: p?.recall2,
    misleading: p?.misleading,
    misleading_what: p?.misleadingWhat,
    manip_check: p?.manip,
    manip_pass: manipPass(s),
    familiar: p?.familiar,
  };
}

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(sessions: Session[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const s of sessions) {
    const row = sessionToRow(s);
    lines.push(CSV_COLUMNS.map((c) => csvCell(row[c])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

export function toJSON(sessions: Session[]): string {
  return JSON.stringify(sessions, null, 2);
}
