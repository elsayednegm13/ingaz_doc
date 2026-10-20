import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = "http://127.0.0.1:43173";
const email = process.env.VERIFY_EMAIL;
const password = process.env.VERIFY_PASSWORD;
const outDir = process.env.CAPTURE_DIR || ".wrangler-verify";
mkdirSync(outDir, { recursive: true });
if (!email || !password) {
  console.error("VERIFY_EMAIL / VERIFY_PASSWORD are required");
  process.exit(2);
}

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

async function shoot(path, name, ready, options = {}) {
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
  if (ready) await page.waitForSelector(ready, { timeout: 40000 });
  await page.waitForTimeout(800);
  // Capture the real viewport: Chrome downsamples anything captured beyond it
  // (fullPage or an enlarged viewport), which makes the QA shots look blurred.
  if (options.bottom) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${outDir}/${name}.png` });
  if (options.bottom) await page.evaluate(() => window.scrollTo(0, 0));
  console.log(`saved ${name}`);
}

try {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForSelector("[data-dashboard='ready']", { timeout: 30000 });

  await shoot("/dashboard", "dashboard-admin-en-1366", "[data-dashboard='ready']");
  await page.setViewportSize({ width: 390, height: 844 });
  await shoot("/dashboard", "dashboard-admin-en-390", "[data-dashboard='ready']");
  await page.setViewportSize({ width: 1366, height: 900 });

  await page.evaluate(() => localStorage.setItem("exportflow.lang", "ar"));
  await shoot("/dashboard", "dashboard-admin-ar-1366", "[data-dashboard='ready']");
  await shoot("/export-cases", "cases-admin-ar-1366", "[data-cases='ready']");
  await shoot(`/export-cases/${process.env.VERIFY_CASE_ID || "a4c74a3b-1368-447c-a1ea-4a86fb088e1a"}`, "dossier-admin-ar-1366", "[data-dossier='loaded']");
  await shoot("/containers", "containers-admin-ar-1366", "[data-containers='ready']");
  await shoot("/reminders", "reminders-admin-ar-1366", "[data-reminders='ready']");
  await shoot("/notifications", "notifications-admin-ar-1366", "[data-notifications='ready']");
  await shoot("/bookings", "bookings-admin-ar-1366", "[data-bookings='ready']");
  await shoot("/schedule", "schedule-admin-ar-1366", "[data-schedule='ready']");
  await shoot("/reports", "reports-admin-ar-1366", "[data-reports='ready']");
  await shoot("/users", "users-admin-ar-1366", "[data-users='ready']");
  await shoot("/settings", "settings-admin-ar-1366", "[data-settings='ready']");
  await shoot("/activity", "activity-admin-ar-1366", "[data-activity='ready']");

  const customerId = await page.evaluate(async () => {
    const response = await fetch("/api/v1/customers?pageSize=1");
    const payload = await response.json();
    return payload?.data?.[0]?.id ?? null;
  });
  if (customerId) {
    await shoot("/customers", "customers-admin-ar-1366", "[data-customers='ready']");
    await shoot(`/customers/${customerId}`, "customer-admin-ar-1366", "[data-customer='ready']");
    await shoot(`/customers/${customerId}`, "customer-admin-ar-1366-bottom", "[data-customer='ready']", { bottom: true });
  } else {
    console.log("no customer found; customer pages not captured");
  }

  const bookingId = await page.evaluate(async () => {
    const response = await fetch("/api/v1/bookings");
    const payload = await response.json();
    return payload?.data?.[0]?.id ?? null;
  });
  if (bookingId) {
    await shoot(`/bookings/${bookingId}`, "booking-admin-ar-1366", "[data-booking='loaded']");
  } else {
    console.log("no booking found; booking detail not captured");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await shoot("/dashboard", "dashboard-admin-ar-390", "[data-dashboard='ready']");
  await shoot("/export-cases", "cases-admin-ar-390", "[data-cases='ready']");
  await shoot("/containers", "containers-admin-ar-390", "[data-containers='ready']");
  await shoot("/reminders", "reminders-admin-ar-390", "[data-reminders='ready']");
  await shoot("/bookings", "bookings-admin-ar-390", "[data-bookings='ready']");
  if (customerId) await shoot(`/customers/${customerId}`, "customer-admin-ar-390", "[data-customer='ready']");

  // Toasts sit at the bottom, on the side that matches the language direction.
  // A fresh page keeps the compositor clean: repeated viewport resizes leave the
  // previous page's raster stale and screenshots come out soft.
  for (const [tag, lang] of [["ar", "ar"], ["en", "en"]]) {
    const toastPage = await context.newPage();
    await toastPage.setViewportSize({ width: 390, height: 844 });
    await toastPage.addInitScript((value) => localStorage.setItem("exportflow.lang", value), lang);
    await toastPage.goto(`${base}/customers/not-a-real-id`, { waitUntil: "domcontentloaded" });
    await toastPage.waitForSelector("[data-sonner-toast]", { timeout: 20000 }).catch(() => {});
    await toastPage.waitForTimeout(900);
    await toastPage.screenshot({ path: `${outDir}/toast-${tag}-390.png` });
    console.log(`saved toast-${tag}-390`);
    await toastPage.close();
  }
} catch (error) {
  console.error("capture failed:", error instanceof Error ? error.message : error);
  await page.screenshot({ path: `${outDir}/design-failure.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");
  await browser.close();
}
