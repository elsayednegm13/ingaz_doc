import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:43174";
const accountsPath = process.argv[3] ?? ".wrangler-e2e/admin.json";
const target = process.argv[4] ?? "/dashboard";
const width = Number(process.argv[5] ?? 390);

const accounts = JSON.parse(readFileSync(accountsPath, "utf8"));
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate(async (creds) => {
  await fetch("/api/v1/auth/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json", "x-bootstrap-secret": creds.bootstrapSecret },
    body: JSON.stringify({ email: creds.email, password: creds.password, name: "E2E Admin" }),
  });
}, accounts);
const form = page.locator("form").filter({ has: page.getByRole("button", { name: /sign in/i }) }).first();
await form.locator('input[name="email"]').fill(accounts.email);
await form.locator('input[name="password"]').fill(accounts.password);
await form.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard|change-password/, { timeout: 30000 });
if (page.url().includes("change-password")) {
  await page.locator('input[name="currentPassword"]').fill(accounts.password);
  await page.locator('input[name="newPassword"]').fill(accounts.password);
  await page.getByRole("button", { name: /^save$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
}
await page.goto(`${base}${target}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const result = await page.evaluate(() => {
  const viewport = document.documentElement.clientWidth;
  const describe = (element) => {
    const parts = [];
    let node = element;
    while (node && node !== document.body && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) part += `#${node.id}`;
      else if (node.className && typeof node.className === "string") {
        part += `.${node.className.trim().split(/\s+/).slice(0, 4).join(".")}`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };
  const rows = [];
  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right <= viewport + 1 && rect.left >= -1) continue;
    // Deepest offenders only: skip when a descendant also overflows.
    const hasOverflowingChild = Array.from(element.children).some(
      (child) => child.getBoundingClientRect().right > viewport + 1 || child.getBoundingClientRect().left < -1,
    );
    if (hasOverflowingChild) continue;
    rows.push({
      element: describe(element),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      text: (element.textContent ?? "").trim().slice(0, 50),
    });
  }
  return { viewport, overflow: document.documentElement.scrollWidth - viewport, rows: rows.slice(0, 12) };
});

console.log(`viewport=${result.viewport} overflow=${result.overflow}`);
for (const row of result.rows) console.log(`  ${row.element}\n     [${row.left}..${row.right}] w=${row.width} "${row.text}"`);
await browser.close();
