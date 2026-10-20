import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:43173";
const email = process.env.VERIFY_EMAIL;
const password = process.env.VERIFY_PASSWORD;

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" });
const page = await context.newPage();

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.locator('input[name="email"]').fill(email);
await page.locator('input[name="password"]').fill(password);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard/, { timeout: 30000 });
await page.evaluate(() => localStorage.setItem("exportflow.lang", "ar"));

for (const path of ["/schedule", "/reports"]) {
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const findings = await page.evaluate(() => {
    const rows = [];
    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      const filter = style.filter;
      const backdrop = style.backdropFilter;
      const opacity = Number(style.opacity);
      if ((filter && filter !== "none") || (backdrop && backdrop !== "none") || (opacity > 0 && opacity < 1)) {
        rows.push({
          tag: el.tagName,
          cls: String(el.className).slice(0, 80),
          filter,
          backdrop,
          opacity,
          position: style.position,
        });
      }
    }
    return {
      rows: rows.slice(0, 20),
      htmlDir: document.documentElement.dir,
      bodyFilter: getComputedStyle(document.body).filter,
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    };
  });
  console.log(path, JSON.stringify(findings, null, 2));
  await page.screenshot({ path: `.tmp-${path.replace("/", "")}-viewport.png` });
}
await browser.close();
