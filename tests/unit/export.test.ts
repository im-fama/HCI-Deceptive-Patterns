import { describe, expect, it } from "vitest";
import { CSV_COLUMNS, csvCell, toCSV } from "../../src/lib/export";
import type { Session } from "../../src/types";

const SPEC_ORDER =
  "id, started, demo, status, condition, assignment, own_platform, years, believes_safer, safer_conf, tech_conf, mobile, outcome, susceptible, paywall_dwell_ms, decision_latency_ms, disclosure_visible_ms, view_details_taps, sheet_dwell_ms, autorenew_toggles, plan_changes, paywall_max_scroll_pct, task_total_ms, trust_mean, t1, t2, t3, t4, t5, recall1, recall2, misleading, misleading_what, manip_check, manip_pass, familiar";

const session: Session = {
  id: "SN-ABCDE",
  startedAt: "2026-10-24T10:00:00.000Z",
  status: "complete",
  demo: false,
  condition: "md",
  assignment: "stratified-block",
  mobile: true,
  ua: "test",
  screen: [390, 844],
  bg: { own: "android", years: "3-5", safer: "ios", saferConf: 5, techConf: 6 },
  post: {
    t1: 2,
    t2: 3,
    t3: 2,
    t4: 4,
    t5: 4,
    recall1: 'It says "free", then\nit charges, yearly',
    recall2: "Rs 2,999",
    misleading: "yes",
    misleadingWhat: "",
    manip: "android",
    familiar: 6,
  },
  events: [],
};

describe("CSV export", () => {
  it("has the §10.1 column order", () => {
    expect(CSV_COLUMNS.join(", ")).toBe(SPEC_ORDER);
    expect(toCSV([]).split("\r\n")[0]).toBe(SPEC_ORDER.replace(/, /g, ","));
  });

  it("escapes quotes, commas and newlines", () => {
    expect(csvCell('a "b"')).toBe('"a ""b"""');
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
    expect(csvCell(false)).toBe("false");
  });

  it("writes a session row with trust mean and manipulation-check pass", () => {
    const csv = toCSV([session]);
    expect(csv).toContain('"It says ""free"", then\nit charges, yearly","Rs 2,999"');
    const header = csv.split("\r\n")[0].split(",");
    // Columns before recall1 contain no commas, so a plain split is safe here.
    const cells = csv.split("\r\n")[1].split(",");
    expect(cells[header.indexOf("trust_mean")]).toBe("3");
    expect(cells[header.indexOf("own_platform")]).toBe("android");
    expect(csv.trimEnd().endsWith("yes,,android,true,6")).toBe(true);
  });
});
