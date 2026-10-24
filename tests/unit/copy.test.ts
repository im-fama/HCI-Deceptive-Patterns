import { describe, expect, it } from "vitest";
import {
  computeTrialEnd,
  ctaText,
  disclosureText,
  formatDate,
  fullTerms,
  plusChargeLine,
  sheetIos,
  sheetMd,
  subscribeOutcome,
} from "../../src/studynest/copy";
import type { PlanState } from "../../src/types";

const END = "31 Oct 2026";
const RENEW: PlanState = { plan: "annual", autoRenew: true };
const NORENEW: PlanState = { plan: "annual", autoRenew: false };
const MONTHLY: PlanState = { plan: "monthly", autoRenew: true };

describe("dates", () => {
  it("formats d MMM yyyy and adds 7 days", () => {
    expect(formatDate(new Date(2026, 9, 31))).toBe(END);
    expect(computeTrialEnd(new Date(2026, 9, 24, 15, 30))).toBe(END);
    expect(computeTrialEnd(new Date(2026, 11, 28))).toBe("4 Jan 2027");
  });
});

describe("paywall copy (§5.3)", () => {
  it("CTA", () => {
    expect(ctaText(RENEW)).toBe("Start my free trial");
    expect(ctaText(NORENEW)).toBe("Start my free trial");
    expect(ctaText(MONTHLY)).toBe("Subscribe for Rs 499/month");
  });

  it("disclosure", () => {
    expect(disclosureText(RENEW, END)).toBe(
      "7 days free, then Rs 2,999/year starting 31 Oct 2026. Subscription renews automatically each year unless cancelled at least 24 hours before the trial ends.",
    );
    expect(disclosureText(NORENEW, END)).toBe("7 days free. Plus ends after the trial and you will not be charged.");
    expect(disclosureText(MONTHLY, END)).toBe("Rs 499/month, charged today. Renews automatically every month until you cancel.");
  });

  it("outcomes (§5.6)", () => {
    expect(subscribeOutcome(RENEW)).toBe("trial_autorenew");
    expect(subscribeOutcome(NORENEW)).toBe("trial_no_renew");
    expect(subscribeOutcome(MONTHLY)).toBe("paid_monthly");
  });

  it("Plus active line", () => {
    expect(plusChargeLine(MONTHLY, END)).toBe("Rs 499 charged today. Renews monthly.");
    expect(plusChargeLine(RENEW, END)).toBe("Trial ends 31 Oct 2026. Rs 2,999 will be charged then.");
    expect(plusChargeLine(NORENEW, END)).toBe("Trial ends 31 Oct 2026. No charge.");
  });
});

describe("purchase sheet copy (§5.4–5.5)", () => {
  it("iOS policy and price", () => {
    const charged = "Cancel anytime in Settings at least one day before each renewal date. Plan renews automatically until cancelled.";
    expect(sheetIos.policy(MONTHLY)).toBe(charged);
    expect(sheetIos.policy(RENEW)).toBe(charged);
    expect(sheetIos.policy(NORENEW)).toBe("Ends automatically after the trial.");
    expect(sheetIos.trial).toBe("1 Week Free");
    expect(sheetIos.price(MONTHLY, END)).toEqual(["", "Rs 499 per month"]);
    expect(sheetIos.price(RENEW, END)).toEqual(["Starting 31 Oct 2026", "Rs 2,999 per year"]);
    expect(sheetIos.price(NORENEW, END)).toEqual(["", "Free for 7 days, then ends"]);
  });

  it("Android timeline and bullets", () => {
    expect(sheetMd.timeline(MONTHLY, END)).toEqual([["Starting today", "Rs 499/month"]]);
    expect(sheetMd.timeline(RENEW, END)).toEqual([
      ["Starting today", "7-day free trial"],
      ["Starting 31 Oct 2026", "Rs 2,999/year"],
    ]);
    expect(sheetMd.timeline(NORENEW, END)).toEqual([
      ["Starting today", "7-day free trial"],
      ["31 Oct 2026", "Trial ends, no charge"],
    ]);
    expect(sheetMd.bullets(MONTHLY, END)).toEqual(["Cancel anytime in Subscriptions"]);
    expect(sheetMd.bullets(RENEW, END)).toEqual(["Cancel anytime in Subscriptions", "You won't be charged if you cancel before 31 Oct 2026"]);
    expect(sheetMd.bullets(NORENEW, END)).toEqual(["No payment needed"]);
  });

  it("full terms", () => {
    expect(fullTerms(MONTHLY, END)).toBe(
      "Payment is charged to your account at confirmation. The subscription renews automatically each month unless it is cancelled at least 24 hours before the end of the current period.",
    );
    expect(fullTerms(RENEW, END)).toBe(
      "No charge during the 7-day trial. On 31 Oct 2026 your account is charged Rs 2,999 and the plan renews every year at the same price unless cancelled at least 24 hours before the renewal date.",
    );
    expect(fullTerms(NORENEW, END)).toBe("No charge. Plus access ends automatically after 7 days.");
  });
});
