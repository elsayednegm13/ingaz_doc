import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:43173";
const email = process.env.VERIFY_EMAIL;
const password = process.env.VERIFY_PASSWORD;
const caseId = process.env.VERIFY_CASE_ID || "a4c74a3b-1368-447c-a1ea-4a86fb088e1a";

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" });
const page = await context.newPage();

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.locator('input[name="email"]').fill(email);
await page.locator('input[name="password"]').fill(password);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard/, { timeout: 30000 });
await page.evaluate(() => localStorage.setItem("exportflow.lang", "ar"));

for (const height of [900, 950, 1000, 1018]) {
  const shot = await context.newPage();
  await shot.setViewportSize({ width: 1366, height });
  await shot.goto(`${base}/export-cases/${caseId}`, { waitUntil: "domcontentloaded" });
  await shot.waitForSelector("[data-dossier='loaded']", { timeout: 40000 });
  await shot.waitForTimeout(1000);
  await shot.screenshot({ path: `.tmp-height-${height}.png` });
  console.log("saved", height, await shot.evaluate(() => [window.innerHeight, window.devicePixelRatio]));
  await shot.close();
}
await browser.close();
