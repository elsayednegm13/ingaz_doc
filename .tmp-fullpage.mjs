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

for (const [path, ready, name] of [
  [`/export-cases/${caseId}`, "[data-dossier='loaded']", "dossier"],
  ["/schedule", "[data-schedule='ready']", "schedule"],
]) {
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(ready, { timeout: 40000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `.tmp-fp-${name}.png`, fullPage: true });
  console.log("saved fullpage", name, await page.evaluate(() => document.documentElement.scrollHeight));
}
await browser.close();
