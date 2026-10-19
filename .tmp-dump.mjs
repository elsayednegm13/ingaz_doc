import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:43173";
const email = process.env.VERIFY_EMAIL;
const password = process.env.VERIFY_PASSWORD;
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" });
const page = await context.newPage();
try {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.evaluate(() => localStorage.setItem("exportflow.lang", "ar"));
  const bookings = await page.evaluate(async () => {
    const response = await fetch("/api/v1/bookings");
    const payload = await response.json();
    return payload.data;
  });
  await page.goto(`${base}/bookings/${bookings[0].id}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-booking='loaded']", { timeout: 30000 });
  await page.waitForTimeout(600);
  console.log("LANG:", await page.evaluate(() => localStorage.getItem("exportflow.lang")));
  console.log("--- booking text ---");
  console.log((await page.locator("body").innerText()).slice(0, 2500));
  await page.screenshot({ path: "docs/qa-screenshots/live-updates/after/booking-debug.png", fullPage: false });
} finally {
  await browser.close();
}
