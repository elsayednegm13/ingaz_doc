import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Captures the loading (skeleton) state of every page and proves that the
 * placeholder is replaced by the real content.
 */
const base = process.argv[2] ?? "http://127.0.0.1:43174";
const accountsPath = process.argv[3] ?? ".wrangler-e2e/admin.json";
const outDir = process.argv[4] ?? "docs/audit/2026-10-20/skeletons";
const delay = Number(process.argv[5] ?? 2500);

const accounts = JSON.parse(readFileSync(accountsPath, "utf8"));
mkdirSync(outDir, { recursive: true });

const pages = [
  { path: "/dashboard", ready: "[data-dashboard='ready']" },
  { path: "/export-cases", ready: "[data-cases='ready']" },
  { path: "/customers", ready: "[data-customers='ready']" },
  { path: "/bookings", ready: "[data-bookings='ready']" },
  { path: "/schedule", ready: "[data-schedule='ready']" },
  { path: "/containers", ready: "[data-containers='ready']" },
  { path: "/reminders", ready: "[data-reminders='ready']" },
  { path: "/reports", ready: "[data-reports='ready']" },
  { path: "/users", ready: "[data-users='ready']" },
  { path: "/settings", ready: "[data-settings='ready']" },
  { path: "/notifications", ready: "[data-notifications='ready']" },
  { path: "/activity", ready: "[data-activity='ready']" },
];

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" });
const page = await context.newPage();

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

// Seed one case so the detail pages have content.
const seeded = await page.evaluate(async () => {
  const stamp = Date.now().toString().slice(-6);
  const post = async (url, body) =>
    (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
  const customer = await post("/api/v1/customers", { legalName: `Skeleton Sample ${stamp}`, countryCode: "EG" });
  const customerId = customer?.data?.id;
  if (!customerId) return {};
  const exportCase = await post("/api/v1/export-cases", {
    customerId,
    documentRoute: "DIRECT_ROUTE",
    destinationCountry: "NL",
    invoice: {
      invoiceNumber: `INV-SK-${stamp}`,
      invoiceDate: "2026-10-20",
      paymentTermCode: "TT",
      incoterm: "FOB",
      namedPlace: "Alexandria",
      currency: "USD",
      goodsValue: "100.00",
      invoicedFreight: "0",
      actualFreightExpense: "0",
      invoiceTotal: "100.00",
      portOfLoading: "Alexandria",
      portOfDischarge: "Rotterdam",
      grossWeight: 10,
      netWeight: 9,
      weightUnit: "KG",
    },
  });
  return { customerId, caseId: exportCase?.data?.id };
});
if (seeded.caseId) pages.push({ path: `/export-cases/${seeded.caseId}`, ready: "[data-dossier='loaded']" });
if (seeded.customerId) pages.push({ path: `/customers/${seeded.customerId}`, ready: "[data-customer='ready']" });

const results = [];
for (const entry of pages) {
  // Slow the API down so the placeholder is visible.
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    // The session request is not delayed, so the page placeholder is captured
    // instead of the workspace placeholder.
    if (url.includes("/api/v1/me") || url.includes("/api/v1/auth/")) {
      await route.continue();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      await route.continue();
    } catch {
      // The route was already handled because the page navigated away.
    }
  });
  await page.goto(`${base}${entry.path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const loading = await page.evaluate(() => ({
    busy: document.querySelectorAll('[aria-busy="true"]').length,
    blocks: document.querySelectorAll('[aria-hidden="true"].animate-pulse').length,
  }));
  const name = entry.path.replace(/[^a-z0-9]+/gi, "-") || "root";
  await page.screenshot({ path: `${outDir}/loading${name}.png` });
  await page.waitForSelector(entry.ready, { timeout: 40000 });
  // Wait until no request is in flight so the leftover check is meaningful.
  await page.waitForLoadState("networkidle", { timeout: 40000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  const loaded = await page.evaluate(() => ({
    busy: document.querySelectorAll('[aria-busy="true"]').length,
    blocks: document.querySelectorAll('[aria-hidden="true"].animate-pulse').length,
  }));
  await page.screenshot({ path: `${outDir}/loaded${name}.png` });
  await page.unroute("**/api/v1/**").catch(() => undefined);
  results.push({ path: entry.path, loading, loaded });
  console.log(
    `${entry.path.padEnd(48)} loading(busy=${loading.busy}, blocks=${loading.blocks}) -> loaded(busy=${loaded.busy}, blocks=${loaded.blocks})`,
  );
}

writeFileSync(`${outDir}/report.json`, JSON.stringify({ base, delay, results }, null, 2));
const leftover = results.filter((row) => row.loaded.busy > 0 || row.loaded.blocks > 0);
console.log(`\npages with a leftover placeholder: ${leftover.length}`);
await browser.close();
