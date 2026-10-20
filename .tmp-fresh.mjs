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

// Measure the dossier height, then capture it in a fresh page.
await page.goto(`${base}/export-cases/${caseId}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-dossier='loaded']", { timeout: 40000 });
await page.waitForTimeout(800);
const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
console.log("dossier height", height);

const fresh = await context.newPage();
await fresh.setViewportSize({ width: 1366, height: Math.min(height, 3200) });
await fresh.goto(`${base}/export-cases/${caseId}`, { waitUntil: "domcontentloaded" });
await fresh.waitForSelector("[data-dossier='loaded']", { timeout: 40000 });
await fresh.waitForTimeout(1400);
await fresh.screenshot({ path: ".tmp-dossier-fresh.png" });
console.log("saved fresh dossier");
await fresh.close();

await browser.close();
