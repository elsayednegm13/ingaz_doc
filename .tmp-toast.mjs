import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:43173";
const email = process.env.VERIFY_EMAIL;
const password = process.env.VERIFY_PASSWORD;

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "en-US" });
const page = await context.newPage();

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.locator('input[name="email"]').fill(email);
await page.locator('input[name="password"]').fill(password);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard/, { timeout: 30000 });
await page.evaluate(() => localStorage.setItem("exportflow.lang", "ar"));

await page.goto(`${base}/customers/not-a-real-id`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-sonner-toast]", { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(900);
await page.screenshot({ path: ".tmp-toast-viewport.png" });
console.log("viewport shot");

const size = page.viewportSize();
const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
await page.setViewportSize({ width: size.width, height });
await page.waitForTimeout(1200);
await page.screenshot({ path: ".tmp-toast-resized.png" });
console.log("resized shot", height);

await browser.close();
