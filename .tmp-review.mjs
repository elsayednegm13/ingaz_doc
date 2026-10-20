import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:43173";
const email = process.env.VERIFY_EMAIL;
const password = process.env.VERIFY_PASSWORD;

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US", deviceScaleFactor: 2 });
const page = await context.newPage();

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.locator('input[name="email"]').fill(email);
await page.locator('input[name="password"]').fill(password);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard/, { timeout: 30000 });
await page.evaluate(() => localStorage.setItem("exportflow.lang", "ar"));

const cases = await page.evaluate(async () => {
  const response = await fetch("/api/v1/export-cases");
  const payload = await response.json();
  return payload.data;
});
console.log("cases", cases.map((row) => `${row.id} ${row.display_number} ${row.status}`).join("\n"));

let target = null;
for (const row of cases) {
  const detail = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/export-cases/${id}`);
    return (await response.json()).data;
  }, row.id);
  if (detail.invoices.length) {
    target = { id: row.id, status: detail.case.status, route: detail.case.document_route, bank: detail.case.bank_path_status, direct: detail.case.direct_path_status, invoices: detail.invoices.length, number: detail.invoices[0].invoice_number };
    break;
  }
}
console.log("target", JSON.stringify(target));
if (!target) {
  await browser.close();
  process.exit(0);
}

await page.goto(`${base}/export-cases/${target.id}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-dossier='loaded']", { timeout: 40000 });
await page.waitForTimeout(1200);
await page.getByRole("region", { name: "مسار المستندات" }).screenshot({ path: ".tmp-lane-docs.png" });
await page.getByRole("region", { name: "مسار البضاعة" }).screenshot({ path: ".tmp-lane-cargo.png" });
console.log("saved lanes");

await page.locator('[data-tab="invoices"]').click();
await page.waitForTimeout(1400);
await page.screenshot({ path: ".tmp-invoices.png" });
const invoiceCard = page.locator("section").filter({ hasText: String(target.number) }).first();
await invoiceCard.screenshot({ path: ".tmp-invoice-card.png" });
console.log("saved invoices");

await browser.close();
