import { expect, type Page } from "@playwright/test";

type Stored = {
  id: string;
  status: string;
  condition: "ios" | "md";
  metrics: Record<string, unknown>;
  events: { type: string; target?: string | null; screen: string }[];
};

export const id = (dataId: string) => `[data-id="${dataId}"]`;

/** Opens the app with empty storage. */
export async function fresh(page: Page, query = "") {
  await page.goto("/" + query);
  await page.evaluate(() => localStorage.clear());
  await page.goto("/" + query);
}

async function pickChoice(page: Page, question: string, option: string) {
  await page.locator("fieldset", { hasText: question }).locator("label", { hasText: option }).first().click();
}

async function pickScale(page: Page, question: string, n: number) {
  await page.locator("fieldset", { hasText: question }).locator("label.scale-pt").nth(n - 1).click();
}

/** Welcome → consent → background → task intro → open StudyNest. */
export async function startTask(page: Page, own: "iPhone" | "Android" | "Other / none" = "Android") {
  await page.getByRole("button", { name: "Start" }).click();
  const agree = page.getByRole("button", { name: "I agree, continue" });
  await expect(agree).toBeDisabled();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await agree.click();

  // Validation fires when something is missing.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toHaveText("Please answer every question.");

  await pickChoice(page, "Which phone do you use most?", own);
  await pickChoice(page, "How long have you used that kind of phone?", "3–5 years");
  await pickChoice(page, "Which phone system protects users better", "Not sure");
  await pickScale(page, "How confident are you in that answer?", 4);
  await pickScale(page, "How confident are you using new apps?", 6);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("You want to try StudyNest's practice tests for free.")).toBeVisible();
  await page.getByRole("button", { name: "Open StudyNest" }).click();
}

/** Onboarding ×2 → Home → Practice tests (paywall). */
export async function toPaywall(page: Page) {
  await page.click(id("onb-continue"));
  await page.click(id("onb-continue"));
  await page.click(id("deck-biology"));
  await page.click(id("locked-tests"));
  await expect(page.locator("#pw-disc")).toBeVisible();
}

export async function fillPost(page: Page) {
  await expect(page.getByText("Tell us about StudyNest")).toBeVisible();
  for (const q of [
    "honest about what I was agreeing to",
    "trust StudyNest with my payment details",
    "act in my interest",
    "clear and straightforward",
    "comfortable using StudyNest",
  ])
    await pickScale(page, q, 3);
  await page.getByLabel("In your own words, what happens when the free trial ends?").fill("don't know");
  await page.getByLabel("Will you be charged anything?").fill("Maybe, Rs 2,999 later");
  await pickChoice(page, "seem misleading", "Yes");
  await pickChoice(page, "look designed for?", "Android");
  await pickScale(page, "How familiar did the app's look and feel seem?", 5);
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.getByText("What this study was really about")).toBeVisible();
}

export async function lastSession(page: Page): Promise<Stored> {
  const all = await page.evaluate(() => JSON.parse(localStorage.getItem("sn_sessions_v1") ?? "[]"));
  expect(all.length).toBeGreaterThan(0);
  return all.sort((a: { startedAt: string }, b: { startedAt: string }) => a.startedAt.localeCompare(b.startedAt)).at(-1);
}

/** Full participant run for a given URL; `act` drives the paywall and ends with Done. */
export async function runSession(page: Page, query: string, act: (page: Page) => Promise<void>) {
  await fresh(page, query);
  await startTask(page);
  await toPaywall(page);
  await act(page);
  await fillPost(page);
  const s = await lastSession(page);
  expect(s.status).toBe("complete");
  return s;
}
