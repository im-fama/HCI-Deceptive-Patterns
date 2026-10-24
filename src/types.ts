export type Condition = "ios" | "md";
export type Plan = "annual" | "monthly";
export type AppScreen = "onb1" | "onb2" | "home" | "paywall" | "plus";

/** The paywall's three possible plan states (§5.3). */
export type PlanKey = "monthly" | "annual_renew" | "annual_norenew";
export type PlanState = { plan: Plan; autoRenew: boolean };

export type EventType =
  | "app_start"
  | "screen_enter"
  | "tap"
  | "deck_tap"
  | "plan_change"
  | "autorenew_toggle"
  | "first_decision"
  | "sheet_open"
  | "sheet_close"
  | "view_details"
  | "disclosure_visible"
  | "disclosure_hidden"
  | "subscribed"
  | "declined"
  | "closed_paywall"
  | "page_hidden"
  | "page_visible"
  | "scroll" // max scroll depth on the paywall, logged when it increases (pct field)
  | "task_end";

export type Outcome = "trial_autorenew" | "paid_monthly" | "trial_no_renew" | "declined" | "closed" | "none";

export type LogEvent = {
  t: number;
  type: EventType;
  screen: AppScreen;
  x?: number;
  y?: number;
  target?: string | null;
  plan?: Plan;
  on?: boolean;
  kind?: "cta" | "decline" | "close";
  ms?: number;
  outcome?: string;
  how?: "cancel" | "subscribe";
  deck?: string;
  condition?: Condition;
  viewport?: [number, number];
  pct?: number;
};

export type Metrics = {
  outcome: Outcome;
  susceptible: boolean;
  paywall_dwell_ms: number;
  decision_latency_ms: number | null;
  disclosure_visible_ms: number;
  view_details_taps: number;
  sheet_dwell_ms: number;
  sheet_opens: number;
  autorenew_toggles: number;
  plan_changes: number;
  paywall_max_scroll_pct: number;
  task_total_ms: number;
};

export type OwnPlatform = "ios" | "android" | "other";

export type Background = {
  own: OwnPlatform;
  years: "<1" | "1-3" | "3-5" | "5+";
  safer: "ios" | "android" | "same" | "unsure";
  saferConf: number;
  techConf: number;
};

export type Post = {
  t1: number;
  t2: number;
  t3: number;
  t4: number;
  t5: number;
  recall1: string;
  recall2: string;
  misleading: "yes" | "no" | "unsure";
  misleadingWhat: string;
  manip: "ios" | "android" | "cant";
  familiar: number;
};

export type SessionStatus = "started" | "assigned" | "task_done" | "complete" | "abandoned";
export type AssignmentKind = "stratified-block" | "forced" | "demo-forced";

export type Session = {
  id: string;
  uid?: string;
  startedAt: string;
  consentAt?: string;
  completedAt?: string;
  status: SessionStatus;
  demo: boolean;
  condition: Condition | null;
  assignment: AssignmentKind | null;
  mobile: boolean;
  ua: string;
  screen: [number, number];
  trialEnd?: string;
  bg?: Background;
  post?: Post;
  metrics?: Metrics;
  events: LogEvent[];
  eventChunks?: number;
};

export type ForceSetting = "auto" | Condition;
export type Settings = { force: ForceSetting; demoMode: boolean };
export type BlockQueues = Record<OwnPlatform, Condition[]>;
