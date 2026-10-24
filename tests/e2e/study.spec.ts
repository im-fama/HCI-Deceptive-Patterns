import { expect, test, type Page } from "@playwright/test";
import { id, runSession } from "./helpers";

test("1. happy path, Android owner: untick auto-renew, view details, cancel, subscribe", async ({ page }) => {
  const s = await runSession(page, "", async (p) => {
    await p.click(id("autorenew"));
    await expect(p.locator("#pw-disc")).toHaveText("7 days free. Plus ends after the trial and you will not be charged.");
    await p.click(id("pw-cta"));
    await p.click(id("sheet-details"));
    await expect(p.getByText("No charge. Plus access ends automatically after 7 days.")).toBeVisible();
    await p.click(id("sheet-cancel"));
    await expect(p.locator(id("sheet-subscribe"))).toHaveCount(0);
    await p.click(id("pw-cta"));
    await p.click(id("sheet-subscribe"));
    await expect(p.getByText("You're on Plus")).toBeVisible();
    await p.click(id("finish"));
  });
  expect(s.metrics).toMatchObject({
    outcome: "trial_no_renew",
    susceptible: false,
    view_details_taps: 1,
    sheet_opens: 2,
    autorenew_toggles: 1,
  });
  expect(s.metrics.task_total_ms).toBeGreaterThan(0);
  expect(s.metrics.decision_latency_ms).not.toBeNull();
  await expect(page.getByTestId("participant-id")).toHaveText(s.id);
});

test("2. susceptible path: subscribe with the defaults", async ({ page }) => {
  const s = await runSession(page, "", async (p) => {
    await p.click(id("pw-cta"));
    await p.click(id("sheet-subscribe"));
    await expect(p.getByText("Rs 2,999 will be charged then.")).toBeVisible();
    await p.click(id("finish"));
  });
  expect(s.metrics).toMatchObject({ outcome: "trial_autorenew", susceptible: true, sheet_opens: 1 });
});

test("3a. decline path", async ({ page }) => {
  const s = await runSession(page, "", async (p) => {
    await p.click(id("pw-decline"));
    await expect(p.getByText("You're on the free plan.")).toBeVisible();
    await p.click(id("finish"));
  });
  expect(s.metrics).toMatchObject({ outcome: "declined", susceptible: false });
});

test("3b. close path", async ({ page }) => {
  const s = await runSession(page, "", async (p) => {
    await p.click(id("pw-close"));
    await expect(p.getByText("You're on the free plan.")).toBeVisible();
    await p.click(id("finish"));
  });
  expect(s.metrics).toMatchObject({ outcome: "closed", susceptible: false });
});

test("4. monthly path hides the check box", async ({ page }) => {
  const s = await runSession(page, "", async (p) => {
    await p.click(id("plan-monthly"));
    await expect(p.locator(id("autorenew"))).toHaveCount(0);
    await expect(p.locator(id("pw-cta"))).toHaveText("Subscribe for Rs 499/month");
    await p.click(id("pw-cta"));
    await p.click(id("sheet-subscribe"));
    await p.click(id("finish"));
  });
  expect(s.metrics).toMatchObject({ outcome: "paid_monthly", susceptible: true, plan_changes: 1 });
});

test("5. the same path in ?v=ios and ?v=md produces the same data-id sequence", async ({ page }) => {
  const path = async (p: Page) => {
    await p.click(id("plan-monthly"));
    await p.click(id("plan-annual"));
    await p.click(id("autorenew"));
    await p.click(id("pw-cta"));
    await p.click(id("sheet-details"));
    await p.click(id("sheet-cancel"));
    await p.click(id("pw-decline"));
    await p.click(id("finish"));
  };
  const ios = await runSession(page, "?v=ios", path);
  const md = await runSession(page, "?v=md", path);
  expect(ios.condition).toBe("ios");
  expect(md.condition).toBe("md");
  const targets = (s: typeof ios) => s.events.filter((e) => e.type === "tap").map((e) => e.target);
  expect(targets(ios).length).toBeGreaterThan(10);
  expect(targets(md)).toEqual(targets(ios));
  expect(md.events.map((e) => e.type)).toEqual(ios.events.map((e) => e.type));
});

test("6. equivalence tab: every 'within 10%' row is green", async ({ page }) => {
  await page.goto("/?researcher=1");
  await page.getByRole("tab", { name: "Equivalence check" }).click();
  const rows = page.locator('[data-testid="equivalence-table"] tr[data-kind="within"]');
  await expect(rows).toHaveCount(7);
  await expect(page.locator('tr[data-kind="within"][data-equal]')).toHaveCount(7);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Re-measure" }).click();
  for (const row of await rows.all()) await expect(row).toHaveAttribute("data-equal", "true");
});

test("7. paywall visible text is identical in both modes", async ({ page }) => {
  const text = async (v: string) => {
    await page.goto(`/?v=${v}&shot=paywall`);
    await page.evaluate(() => document.fonts.ready);
    return page.getByTestId("paywall").evaluate((el) => (el as HTMLElement).innerText);
  };
  const ios = await text("ios");
  const md = await text("md");
  expect(ios).toContain("No thanks, I'll keep studying the hard way");
  expect(md).toBe(ios);
});

test("8a. on a 390px phone the app fills the screen without the fake status bar", async ({ page }) => {
  await page.goto("/?v=md&shot=paywall");
  await expect(page.locator(".sn-statusbar")).toBeHidden();
  const box = await page.locator(".sn-device").boundingBox();
  expect(box).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("8b. at 1280px the device frame and status bar are shown", async ({ page }) => {
    await page.goto("/?v=ios&shot=paywall");
    await expect(page.locator(".sn-statusbar")).toBeVisible();
    await expect(page.locator(".sn-statusbar")).toContainText("9:41");
    const box = await page.locator(".sn-device").boundingBox();
    expect(box!.width).toBe(410); // 390 + 2 × 10px bezel
    expect(box!.x).toBeGreaterThan(300);
  });

  test("desktop participants see the computer notice", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("You seem to be on a computer.")).toBeVisible();
  });
});
