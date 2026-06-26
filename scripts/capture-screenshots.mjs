import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../screenshots");
const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3001";

async function waitForApp(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
}

async function clickButton(page, name) {
  await page.getByRole("button", { name, exact: false }).click({ timeout: 15000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1 — Sign-in screen
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await waitForApp(page);
  await page.screenshot({
    path: path.join(OUT, "01-sign-in.png"),
    fullPage: false,
  });

  // Mock sign-in
  await clickButton(page, "Continue with Google");
  await page.waitForTimeout(1500);

  // 2 — Onboarding welcome step
  const onboardingHeading = page.getByRole("heading", { name: /where's your weekend/i });
  if (await onboardingHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.screenshot({
      path: path.join(OUT, "02-onboarding.png"),
      fullPage: false,
    });

    await page.getByRole("button", { name: "Austin" }).click();
    await clickButton(page, "Let's go →");
    await page.waitForTimeout(400);
    await clickButton(page, "Next →");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "No restrictions" }).click();
    await clickButton(page, "Next →");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Live music" }).click();
    await clickButton(page, "Next →");
    await page.waitForTimeout(400);
    await clickButton(page, "Skip");
    await page.waitForTimeout(2500);
  }

  await page.waitForTimeout(3000);

  // 3 — Discover + map
  await page.screenshot({
    path: path.join(OUT, "03-discover-map.png"),
    fullPage: false,
  });

  // 4 — Event detail (EventCard is a button in the discover list)
  const eventCards = page.locator("aside .grid > button");
  const count = await eventCards.count();
  if (count > 0) {
    await eventCards.first().click();
  }

  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(OUT, "04-event-detail.png"),
    fullPage: false,
  });

  await browser.close();
  console.log(`Screenshots saved to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
