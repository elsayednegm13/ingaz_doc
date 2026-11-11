import { afterEach, describe, expect, it } from "vitest";
import { createTestHarness } from "../transition-2026-10-21/harness/app";
import { createW2Database, count, type W2Database } from "./harness/db";
import { exportQuotationsCsv } from "../../server/services/quotations";
import type { Actor } from "../../server/services/actor";

let audit: W2Database | null = null;

afterEach(() => {
  audit?.close();
  audit = null;
});

describe("scratch", () => {
  it("prints csv body and quotations columns", async () => {
    audit = createW2Database();
    const harness = createTestHarness(audit);
    const actor: Actor = {
      id: "user-admin",
      email: "admin@test",
      emailVerified: true,
      is_active: 1,
      is_active_admin: 1,
      mustChangePassword: false,
      permissions: new Set([
        "quotations.view",
        "quotations.create",
        "quotations.edit",
        "quotations.issue",
        "quotations.record_response",
        "quotations.export",
        "quotations.view_all",
        "export_cases.edit",
      ]),
      caseScope: new Set(),
    } as unknown as Actor;
    const created = await harness.request({
      method: "POST",
      path: "/api/v1/quotations",
      body: {
        quoteNumber: "12/٠٠٨",
        customerId: "customer-quote",
        items: [{ description: "line", quantity: "3", unitPrice: "5" }],
      },
    });
    console.log("CREATE_STATUS", created.status, JSON.stringify(created.json));
    const csv = await harness.request({ path: "/api/v1/quotations.csv" });
    console.log("SERVED_CP0", (csv.text as string).charCodeAt(0), (csv.text as string).charCodeAt(1));
    const direct = await exportQuotationsCsv(audit.db, actor);
    console.log("DIRECT_CP0", direct.charCodeAt(0), direct.charCodeAt(1));
    const mini = new Response("\uFEFFx", { headers: { "Content-Type": "text/csv; charset=utf-8" } });
    console.log("MINI_CP0", (await mini.clone().text()).charCodeAt(0));
    const through = await harness.app.fetch(
      new Request("http://127.0.0.1:43199/api/v1/quotations.csv", { method: "GET", headers: { "x-test-actor": "user-admin" } }),
      harness.env,
      { waitUntil() {}, passThroughOnException() {} } as never,
    );
    console.log("THROUGH_CP0", (await through.clone().text()).charCodeAt(0));
  });
});
