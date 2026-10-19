import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = "http://127.0.0.1:43173";
const email = process.env.VERIFY_EMAIL;
const password = process.env.VERIFY_PASSWORD;
const outDir = process.env.CAPTURE_DIR || "docs/qa-screenshots/live-updates/after";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "en-US" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

let publicContext;
try {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });

  const cases = await page.evaluate(async () => {
    const response = await fetch("/api/v1/export-cases");
    const payload = await response.json();
    return payload.data;
  });
  const caseId = cases[0].id;
  const link = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/export-cases/${id}/tracking-links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(payload));
    return payload.data;
  }, caseId);
  console.log("token:", link.token);

  publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "en-US" });
  const publicPage = await publicContext.newPage();
  publicPage.on("pageerror", (error) => errors.push(error.message));

  async function shot(language, name, width) {
    await publicPage.setViewportSize({ width, height: 1000 });
    await publicPage.goto(`${base}/track/${link.token}`, { waitUntil: "domcontentloaded" });
    await publicPage.evaluate((lang) => localStorage.setItem("exportflow.lang", lang), language);
    await publicPage.reload({ waitUntil: "domcontentloaded" });
    await publicPage.waitForSelector("[data-track='ready']", { timeout: 30000 });
    await publicPage.waitForTimeout(500);
    await publicPage.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
    console.log("saved", name);
  }

  await shot("ar", "track-ar-1440", 1440);
  await shot("en", "track-en-1440", 1440);
  await shot("ar", "track-ar-390", 390);
} catch (error) {
  console.error("track capture failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  console.log("page errors:", errors.length ? errors.slice(0, 5) : "none");
  await browser.close();
}
