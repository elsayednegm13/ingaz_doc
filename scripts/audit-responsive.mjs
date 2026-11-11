import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Responsive audit: visits every page at the required widths and reports
 * horizontal overflow, the elements that cause it, and any element that is
 * rendered outside the viewport.
 */
const base = process.argv[2] ?? "http://127.0.0.1:43174";
const accountsPath = process.argv[3] ?? ".wrangler-e2e/admin.json";
const outDir = process.argv[4] ?? "docs/audit/2026-10-20/responsive";
const widths = [320, 360, 375, 390, 430, 768, 1024, 1440];
const captureWidths = new Set([320, 390, 768, 1440]);

const pages = [
  { path: "/dashboard", ready: "[data-dashboard='ready']" },
  { path: "/export-cases", ready: "[data-cases='ready']" },
  { path: "/export-cases/new", ready: "form" },
  { path: "/customers", ready: "[data-customers='ready']" },
  { path: "/customers/new", ready: "form" },
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

const accounts = JSON.parse(readFileSync(accountsPath, "utf8"));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "en-US" });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
// The standalone server starts empty. Create the first administrator with the
// one shot bootstrap secret, exactly like the setup test does.
const bootstrapped = await page.evaluate(async (creds) => {
  const response = await fetch("/api/v1/auth/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json", "x-bootstrap-secret": creds.bootstrapSecret },
    body: JSON.stringify({ email: creds.email, password: creds.password, name: "E2E Admin" }),
  });
  return { status: response.status, body: await response.text() };
}, accounts);
if (bootstrapped.status >= 400 && bootstrapped.status !== 409) {
  console.log(`bootstrap failed: ${bootstrapped.status} ${bootstrapped.body}`);
}

const signInForm = page.locator("form").filter({ has: page.getByRole("button", { name: /sign in/i }) }).first();
await signInForm.locator('input[name="email"]').fill(accounts.email);
await signInForm.locator('input[name="password"]').fill(accounts.password);
await signInForm.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/dashboard|change-password/, { timeout: 30000 });
if (page.url().includes("change-password")) {
  await page.locator('input[name="currentPassword"]').fill(accounts.password);
  await page.locator('input[name="newPassword"]').fill(accounts.password);
  await page.getByRole("button", { name: /^save$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
}

// Seed a few records so list and detail pages have real content.
const seeded = await page.evaluate(async () => {
  const stamp = Date.now().toString().slice(-6);
  const post = async (url, body) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.json().catch(() => null);
  };
  const customer = await post("/api/v1/customers", {
    legalName: `Responsive Sample ${stamp}`,
    tradeName: "Responsive Trading Company",
    countryCode: "EG",
    notes: "A long note that can stretch a card on narrow screens to prove the layout wraps instead of overflowing.",
    contacts: [{ fullName: "Mona Saleh", phone: "+20100000001", isPrimary: true }],
    addresses: [{ kind: "SHIPPING", line1: "12 Corniche Street", city: "Alexandria", countryCode: "EG", isPrimary: true }],
    banks: [{ bankName: "Bank of Alexandria", accountNumber: "123456789", iban: "EG123456789012345678901234" }],
  });
  const customerId = customer?.data?.id;
  if (!customerId) return { customerId: null };
  const exportCase = await post("/api/v1/export-cases", {
    customerId,
    documentRoute: "DIRECT_ROUTE",
    destinationCountry: "NL",
    invoice: {
      invoiceNumber: `INV-RESP-${stamp}`,
      invoiceDate: "2026-10-20",
      paymentTermCode: "TT",
      incoterm: "FOB",
      namedPlace: "Alexandria",
      currency: "USD",
      goodsValue: "1000.00",
      invoicedFreight: "0",
      actualFreightExpense: "0",
      invoiceTotal: "1000.00",
      portOfLoading: "Alexandria",
      portOfDischarge: "Rotterdam",
      grossWeight: 12.5,
      netWeight: 11.2,
      weightUnit: "KG",
    },
  });
  const caseId = exportCase?.data?.id;
  const booking = await post("/api/v1/bookings", {
    caseId,
    bookingNumber: `BK-RESP-${stamp}`,
    shippingLine: "MSC",
    expectedContainers: 3,
    plannedEtd: "2026-11-02",
    plannedEta: "2026-11-20",
  });
  return { customerId, caseId, bookingId: booking?.data?.id ?? null };
});

if (seeded.customerId) {
  pages.push({ path: `/customers/${seeded.customerId}`, ready: "[data-customer='ready']" });
}
if (seeded.caseId) {
  pages.push({ path: `/export-cases/${seeded.caseId}`, ready: "[data-dossier='loaded']" });
}
if (seeded.bookingId) {
  pages.push({ path: `/bookings/${seeded.bookingId}`, ready: "[data-booking='loaded']" });
}

const report = [];

async function measure() {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const viewport = doc.clientWidth;
    const overflow = doc.scrollWidth - viewport;
    const offenders = [];
    const describe = (element) => {
      const parts = [];
      let node = element;
      while (node && node !== document.body && parts.length < 4) {
        let part = node.tagName.toLowerCase();
        if (node.id) part += `#${node.id}`;
        else if (node.className && typeof node.className === "string") {
          part += `.${node.className.trim().split(/\s+/).slice(0, 3).join(".")}`;
        }
        parts.unshift(part);
        node = node.parentElement;
      }
      return parts.join(" > ");
    };
    for (const element of Array.from(document.body.querySelectorAll("*"))) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(element);
      if (style.position === "fixed" || style.visibility === "hidden" || style.display === "none") continue;
      if (rect.right > viewport + 1 || rect.left < -1) {
        // Only report the outermost offender of a chain.
        const parent = element.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          if (parentRect.right > viewport + 1 || parentRect.left < -1) continue;
        }
        offenders.push({
          element: describe(element),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: (element.textContent ?? "").trim().slice(0, 60),
        });
      }
      if (offenders.length >= 8) break;
    }
    // Elements that are wider than the viewport are the usual cause of a page
    // level scrollbar, so they are reported even when they are not clipped.
    const wide = [];
    for (const element of Array.from(document.body.querySelectorAll("table, pre, .overflow-x-auto, img, svg, canvas"))) {
      const rect = element.getBoundingClientRect();
      if (rect.width > viewport + 1) wide.push({ element: describe(element), width: Math.round(rect.width) });
      if (wide.length >= 8) break;
    }
    return { overflow, offenders, wide };
  });
}

for (const entry of pages) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}${entry.path}`, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForSelector(entry.ready, { timeout: 20000 });
    } catch {
      /* the page may not expose a ready marker; measure what rendered */
    }
    await page.waitForTimeout(500);
    const result = await measure();
    const name = `${entry.path.replace(/[^a-z0-9]+/gi, "-") || "root"}-${width}`;
    if (captureWidths.has(width)) {
      await page.screenshot({ path: `${outDir}/${name}.png` });
    }
    report.push({ path: entry.path, width, ...result });
    const flag = result.overflow > 1 ? "OVERFLOW" : "ok";
    console.log(`${flag.padEnd(9)} ${String(width).padStart(4)}px ${entry.path} overflow=${result.overflow}`);
    for (const offender of result.offenders) {
      console.log(`          offender ${offender.element} [${offender.left}..${offender.right}] "${offender.text}"`);
    }
  }
}

writeFileSync(
  `${outDir}/report.json`,
  JSON.stringify({ base, widths, pages: pages.map((p) => p.path), results: report, consoleErrors }, null, 2),
);
console.log("\nsummary");
for (const entry of report.filter((row) => row.overflow > 1)) {
  console.log(`  ${entry.path} @ ${entry.width}px -> ${entry.overflow}px overflow`);
}
console.log(`console errors: ${consoleErrors.length}`);
await browser.close();
