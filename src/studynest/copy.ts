// Single source for ALL study text, prices and dates. Both conditions read from here.
import type { PlanKey, PlanState } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** `d MMM yyyy`, e.g. "31 Oct 2026". */
export function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Today + 7 days, computed once per session. */
export function computeTrialEnd(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  return formatDate(d);
}

export function weekday(now: Date = new Date()): string {
  return WEEKDAYS[now.getDay()];
}

export function planKey(s: PlanState): PlanKey {
  if (s.plan === "monthly") return "monthly";
  return s.autoRenew ? "annual_renew" : "annual_norenew";
}

/** Outcome of tapping Subscribe in a given state (§5.6). */
export function subscribeOutcome(s: PlanState): "paid_monthly" | "trial_autorenew" | "trial_no_renew" {
  const k = planKey(s);
  return k === "monthly" ? "paid_monthly" : k === "annual_renew" ? "trial_autorenew" : "trial_no_renew";
}

export const PRICE = {
  yearly: "Rs 2,999",
  monthly: "Rs 499",
  yearlyPerMonth: "Rs 250",
};

export const app = {
  brand: "StudyNest",
  badge: "S",
  onb1: { title: "Plan your study week", body: "Turn your syllabus into short daily sessions that fit around classes.", button: "Continue" },
  onb2: { title: "Remember more with flashcards", body: "StudyNest schedules reviews right before you would forget.", button: "Get started" },
  home: {
    title: "Today",
    avatar: "A",
    dueToday: "Due today",
    decks: [
      { id: "biology", letter: "B", name: "Biology", meta: "24 cards due · 12 min", color: "#3F7FBF" },
      { id: "chemistry", letter: "C", name: "Chemistry", meta: "12 cards due · 6 min", color: "#B5653A" },
      { id: "maths", letter: "M", name: "Maths", meta: "Quiz tomorrow", color: "#6B5FB5" },
    ],
    examPrep: "Exam prep",
    testsTitle: "Practice tests",
    testsMeta: "Full mock exams with marking",
    plusPill: "PLUS",
    plusActive: "Plus is active",
    freePlan: "You're on the free plan.",
    done: "Done",
    tabs: ["Today", "Decks", "Stats", "Profile"],
  },
  paywall: {
    close: "✕",
    heading: "Study smarter with Plus",
    benefits: ["Full mock exams with marking", "Unlimited flashcard decks", "Smart revision plan before each exam"],
    yearly: { name: "Yearly", meta: `${PRICE.yearlyPerMonth}/month, billed yearly`, tag: "7 DAYS FREE" },
    monthly: { name: "Monthly", meta: `${PRICE.monthly}/month` },
    checkbox: "Continue with Plus after my free trial",
    decline: "No thanks, I'll keep studying the hard way",
    legal: "Terms of Use · Privacy · Restore purchases",
  },
  plus: {
    title: "You're on Plus",
    body: "Practice tests are unlocked.",
    done: "Done",
  },
};

export function ctaText(s: PlanState): string {
  return s.plan === "monthly" ? `Subscribe for ${PRICE.monthly}/month` : "Start my free trial";
}

export function disclosureText(s: PlanState, trialEnd: string): string {
  switch (planKey(s)) {
    case "annual_renew":
      return `7 days free, then ${PRICE.yearly}/year starting ${trialEnd}. Subscription renews automatically each year unless cancelled at least 24 hours before the trial ends.`;
    case "annual_norenew":
      return "7 days free. Plus ends after the trial and you will not be charged.";
    case "monthly":
      return `${PRICE.monthly}/month, charged today. Renews automatically every month until you cancel.`;
  }
}

export function plusChargeLine(s: PlanState, trialEnd: string): string {
  switch (planKey(s)) {
    case "monthly":
      return `${PRICE.monthly} charged today. Renews monthly.`;
    case "annual_renew":
      return `Trial ends ${trialEnd}. ${PRICE.yearly} will be charged then.`;
    case "annual_norenew":
      return `Trial ends ${trialEnd}. No charge.`;
  }
}

/** Full terms shown by "View details" (§5.5). */
export function fullTerms(s: PlanState, trialEnd: string): string {
  switch (planKey(s)) {
    case "monthly":
      return "Payment is charged to your account at confirmation. The subscription renews automatically each month unless it is cancelled at least 24 hours before the end of the current period.";
    case "annual_renew":
      return `No charge during the 7-day trial. On ${trialEnd} your account is charged ${PRICE.yearly} and the plan renews every year at the same price unless cancelled at least 24 hours before the renewal date.`;
    case "annual_norenew":
      return "No charge. Plus access ends automatically after 7 days.";
  }
}

/** Charged = the participant will pay something if they subscribe in this state. */
export function isCharged(s: PlanState): boolean {
  return planKey(s) !== "annual_norenew";
}

export const sheetCommon = {
  appName: "StudyNest Plus",
  viewDetails: "View details",
  subscribe: "Subscribe",
  cancel: "Cancel",
};

export const sheetIos = {
  header: "Subscription",
  appSub: "StudyNest · Subscription",
  labels: { policy: "POLICY", trial: "TRIAL", price: "PRICE" },
  trial: "1 Week Free",
  policy(s: PlanState): string {
    return isCharged(s)
      ? "Cancel anytime in Settings at least one day before each renewal date. Plan renews automatically until cancelled."
      : "Ends automatically after the trial.";
  },
  /** PRICE row: [small line, emphasised line] — either may be empty. */
  price(s: PlanState, trialEnd: string): [string, string] {
    switch (planKey(s)) {
      case "monthly":
        return ["", `${PRICE.monthly} per month`];
      case "annual_renew":
        return [`Starting ${trialEnd}`, `${PRICE.yearly} per year`];
      case "annual_norenew":
        return ["", "Free for 7 days, then ends"];
    }
  },
};

export const sheetMd = {
  appSub: "StudyNest: study planner",
  /** Timeline rows: [left, right]. */
  timeline(s: PlanState, trialEnd: string): [string, string][] {
    switch (planKey(s)) {
      case "monthly":
        return [["Starting today", `${PRICE.monthly}/month`]];
      case "annual_renew":
        return [
          ["Starting today", "7-day free trial"],
          [`Starting ${trialEnd}`, `${PRICE.yearly}/year`],
        ];
      case "annual_norenew":
        return [
          ["Starting today", "7-day free trial"],
          [trialEnd, "Trial ends, no charge"],
        ];
    }
  },
  bullets(s: PlanState, trialEnd: string): string[] {
    const out = [isCharged(s) ? "Cancel anytime in Subscriptions" : "No payment needed"];
    if (planKey(s) === "annual_renew") out.push(`You won't be charged if you cancel before ${trialEnd}`);
    return out;
  },
};

// ---------------------------------------------------------------- study shell (§4)

export const TEAM = ["Fatima Irfan", "Sumaiya Batool", "Zainab Irfan Ansari"];

export const shell = {
  welcome: {
    eyebrow: "HCI PILOT STUDY · STUDYNEST",
    title: "Try a study app and tell us what you think",
    text: "We are three HCI students testing how people use a study-planner app. The session takes about 8 minutes. Please use your own phone if you can.",
    panelTitle: "What you will do",
    steps: ["Answer a few questions about yourself.", "Complete one short task in the app.", "Answer questions about the app."],
    note: "No real payment is taken. You will not need an account or any personal details.",
    desktop: "You seem to be on a computer. The study is designed for a phone, but it will still work here.",
    start: "Start",
    research: "Research team",
  },
  consent: {
    eyebrow: "CONSENT",
    title: "Before we begin",
    items: [
      "I am 18 or older.",
      "I understand taking part is voluntary and I can stop at any time.",
      "I agree that my anonymous answers and taps in the app are recorded for this course project.",
    ],
    note: "We record which buttons you tap and how long you spend on each screen. We do not record your name, contacts or anything outside this page. Some details of the study are explained only at the end, so that they do not affect how you use the app.",
    agree: "I agree, continue",
    back: "Back",
  },
  background: {
    eyebrow: "ABOUT YOU",
    title: "A few questions about you",
    error: "Please answer every question.",
    next: "Continue",
  },
  task: {
    card: "You want to try StudyNest's practice tests for free. You do not want to pay anything. Go ahead and get access.",
    title: "Your task",
    notePre: "Use the app the way you normally would. There are no right or wrong answers, and we are testing the app, not you. When you're finished, tap ",
    noteDone: "Done",
    notePost: " in the app.",
    open: "Open StudyNest",
  },
  post: {
    eyebrow: "ABOUT THE APP",
    title: "Tell us about StudyNest",
    trustTitle: "How much do you agree?",
    recallTitle: "In your own words",
    lastTitle: "A few last questions",
    error: 'Please answer every question. For the open questions, a short answer or "don\'t know" is fine.',
    submit: "Submit answers",
  },
  debrief: {
    eyebrow: "THANK YOU",
    title: "What this study was really about",
    intro: "StudyNest is not a real app. Its offer screen contained three deceptive design patterns on purpose:",
    patterns: [
      ["Visual interference", 'the yearly charge was written in small, light grey text under a large "free trial" button.'],
      ["Preselection", '"Continue with Plus after my free trial" was ticked for you, which turns the free trial into a paid yearly plan.'],
      ["Confirmshaming", 'the way to say no was worded to make you feel bad ("I\'ll keep studying the hard way").'],
    ] as [string, string][],
    why: "Half of the people in this study saw the app styled like an iPhone app and half saw it styled like an Android app. We want to know whether the style changes how much people trust the app and whether they notice these tricks. A 2025 study found these patterns in real iPhone and Android apps.",
    safe: "Nobody was charged and no payment details were collected. Please don't tell other possible participants about the tricks until the study is finished.",
    idLabel: "Your participant ID",
    removal: `If you want your data removed, give this ID to one of the research team: ${TEAM[0]}, ${TEAM[1]} or ${TEAM[2]}.`,
  },
};

type Opt<V extends string> = { value: V; label: string };

export const backgroundQuestions = {
  own: {
    label: "Which phone do you use most?",
    options: [
      { value: "ios", label: "iPhone" },
      { value: "android", label: "Android" },
      { value: "other", label: "Other / none" },
    ] as Opt<"ios" | "android" | "other">[],
  },
  years: {
    label: "How long have you used that kind of phone?",
    options: [
      { value: "<1", label: "Under 1 year" },
      { value: "1-3", label: "1–3 years" },
      { value: "3-5", label: "3–5 years" },
      { value: "5+", label: "Over 5 years" },
    ] as Opt<"<1" | "1-3" | "3-5" | "5+">[],
  },
  safer: {
    label: "Which phone system protects users better from misleading or scam apps?",
    options: [
      { value: "ios", label: "iPhone (iOS)" },
      { value: "android", label: "Android" },
      { value: "same", label: "About the same" },
      { value: "unsure", label: "Not sure" },
    ] as Opt<"ios" | "android" | "same" | "unsure">[],
  },
  saferConf: { label: "How confident are you in that answer?", low: "Not at all", high: "Very" },
  techConf: { label: "How confident are you using new apps?", low: "Not at all", high: "Very" },
};

export const trustItems: [`t${1 | 2 | 3 | 4 | 5}`, string][] = [
  ["t1", "StudyNest was honest about what I was agreeing to."],
  ["t2", "I would trust StudyNest with my payment details."],
  ["t3", "StudyNest seemed to act in my interest."],
  ["t4", "The offer screen was clear and straightforward."],
  ["t5", "I would feel comfortable using StudyNest."],
];

export const postQuestions = {
  trustScale: { low: "Strongly disagree", high: "Strongly agree" },
  recall1: "In your own words, what happens when the free trial ends?",
  recall2: "Will you be charged anything? If yes, how much and when?",
  recallHint: '"Don\'t know" is a fine answer.',
  misleading: {
    label: "Did anything on the offer screen seem misleading, or designed to push you into a choice?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure" },
    ] as Opt<"yes" | "no" | "unsure">[],
  },
  misleadingWhat: "If yes, what was it? (optional)",
  manip: {
    label: "Which phone system did the StudyNest app look designed for?",
    options: [
      { value: "ios", label: "iPhone (iOS)" },
      { value: "android", label: "Android" },
      { value: "cant", label: "Couldn't tell" },
    ] as Opt<"ios" | "android" | "cant">[],
  },
  familiar: { label: "How familiar did the app's look and feel seem?", low: "Very unfamiliar", high: "Very familiar" },
};
