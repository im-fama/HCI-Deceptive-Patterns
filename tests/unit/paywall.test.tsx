import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaticPaywall } from "../../src/studynest/StudyNestApp";

describe("Paywall (one component, two modes)", () => {
  it("renders identical text and data-id order in iOS and Android modes", () => {
    const ios = render(<StaticPaywall mode="ios" trialEnd="31 Oct 2026" />);
    const iosText = ios.getByTestId("paywall").textContent;
    const iosIds = [...ios.container.querySelectorAll("[data-id]")].map((e) => e.getAttribute("data-id"));
    ios.unmount();

    const md = render(<StaticPaywall mode="md" trialEnd="31 Oct 2026" />);
    expect(md.getByTestId("paywall").textContent).toBe(iosText);
    expect([...md.container.querySelectorAll("[data-id]")].map((e) => e.getAttribute("data-id"))).toEqual(iosIds);
    expect(iosIds).toEqual(["pw-close", "plan-annual", "plan-monthly", "autorenew", "pw-cta", "pw-decline"]);
  });

  it("preselects Yearly and auto-renew", () => {
    const r = render(<StaticPaywall mode="ios" trialEnd="31 Oct 2026" />);
    expect(r.container.querySelector('[data-id="plan-annual"]')).toHaveAttribute("aria-checked", "true");
    expect(r.container.querySelector('[data-id="autorenew"]')).toHaveAttribute("aria-checked", "true");
    expect(r.container.querySelector("#pw-disc")).toHaveTextContent("Rs 2,999/year starting 31 Oct 2026");
  });
});
