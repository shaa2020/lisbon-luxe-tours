/**
 * Financial and timesheet integrity rules enforced by the database.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, attempt, buildFixture, createPool, createShift, expectError, inviteWorker, type Fixture } from "./helpers";

const db = createPool();
let f: Fixture;

beforeAll(async () => {
  f = await buildFixture(db);
});
afterAll(async () => {
  await db.end();
});

async function draftInvoice(clientId = f.clients.c1) {
  const inv = (await db.query(
    "insert into public.invoices (agency_id, client_id, created_by) values ($1, $2, $3) returning id",
    [f.agencyA, clientId, f.users.financeA],
  )).rows[0].id as string;
  await db.query(
    `insert into public.invoice_items (agency_id, invoice_id, description, quantity, unit_price, vat_rate)
     values ($1, $2, 'Cleaning 7.5h', 7.5, 32.40, 21), ($1, $2, 'Weekend surcharge', 2, 8.10, 21)`,
    [f.agencyA, inv],
  );
  return inv;
}

async function issue(invoiceId: string) {
  await db.query("update public.invoices set status = 'review' where id = $1", [invoiceId]);
  await db.query(
    `update public.invoices set status = 'issued', invoice_number = app.next_document_number(agency_id, 'INV', current_date),
       issue_date = current_date, due_date = current_date + 14, issued_at = now(), issued_by = $2,
       billing_snapshot = '{"name":"Client One"}' where id = $1`,
    [invoiceId, f.users.financeA],
  );
}

describe("invoice calculations", () => {
  it("totals are derived from line items with per-line VAT rounding", async () => {
    const inv = await draftInvoice();
    const r = (await db.query("select subtotal, vat_total, total from public.invoices where id = $1", [inv])).rows[0];
    // 7.5 × 32.40 = 243.00; 2 × 8.10 = 16.20 → 259.20; VAT 51.03 + 3.40 = 54.43
    expect(r).toEqual({ subtotal: "259.20", vat_total: "54.43", total: "313.63" });
  });

  it("invoice numbers are sequential and gapless per series and year", async () => {
    const a = await draftInvoice();
    const b = await draftInvoice();
    await issue(a);
    await issue(b);
    const nums = (await db.query("select invoice_number from public.invoices where id = any($1) order by invoice_number", [[a, b]])).rows.map((r) => r.invoice_number);
    const n = nums.map((x: string) => Number(x.split("-").pop()));
    expect(n[1] - n[0]).toBe(1);
    expect(nums[0]).toMatch(/^INV-\d{4}-\d{5}$/);
  });
});

describe("invoice permissions and immutability", () => {
  it("a user without invoices.issue cannot issue invoices", async () => {
    const inv = await draftInvoice();
    await db.query("update public.invoices set status = 'review' where id = $1", [inv]);
    await asUser(db, f.users.invoiceDrafterA, async (tx) => {
      await expectError(
        attempt(tx, `update public.invoices set status = 'issued', issue_date = current_date, due_date = current_date + 14,
                     issued_at = now(), billing_snapshot = '{}' where id = $1`, [inv]),
        "not authorised to issue",
      );
    });
  });

  it("invoice numbers cannot be chosen by users", async () => {
    const inv = await draftInvoice();
    await asUser(db, f.users.financeA, async (tx) => {
      await expectError(attempt(tx, "update public.invoices set invoice_number = 'INV-HACK' where id = $1", [inv]), "assigned by the system");
    });
  });

  it("issued invoices and their items are immutable", async () => {
    const inv = await draftInvoice();
    await issue(inv);
    await expectError(db.query("update public.invoices set notes = 'changed' where id = $1", [inv]), "immutable");
    await expectError(db.query("update public.invoice_items set unit_price = 1 where invoice_id = $1", [inv]), "credit note");
    await expectError(db.query("delete from public.invoices where id = $1", [inv]), "draft");
  });

  it("payments are append-only and drive payment status", async () => {
    const inv = await draftInvoice();
    await issue(inv);
    await asUser(db, f.users.financeA, async (tx) => {
      await tx.query("insert into public.payments (agency_id, invoice_id, amount, paid_on, method, recorded_by) values ($1, $2, 100, current_date, 'bank_transfer', $3)", [f.agencyA, inv, f.users.financeA]);
      expect((await tx.query("select status, amount_paid from public.invoices where id = $1", [inv])).rows[0]).toEqual({ status: "partially_paid", amount_paid: "100.00" });
      // Payment status cannot be set by hand.
      await expectError(attempt(tx, "update public.invoices set status = 'paid' where id = $1", [inv]), "derived from recorded payments");
      await tx.query("insert into public.payments (agency_id, invoice_id, amount, paid_on, method, recorded_by) values ($1, $2, 213.63, current_date, 'bank_transfer', $3)", [f.agencyA, inv, f.users.financeA]);
      expect((await tx.query("select status from public.invoices where id = $1", [inv])).rows[0].status).toBe("paid");
      expect((await tx.query("update public.payments set amount = 1 where invoice_id = $1", [inv])).rowCount).toBe(0);
    });
    // Committed payments cannot be altered even by the superuser.
    await db.query("insert into public.payments (agency_id, invoice_id, amount, paid_on, method, recorded_by) values ($1, $2, 50, current_date, 'bank_transfer', $3)", [f.agencyA, inv, f.users.financeA]);
    await expectError(db.query("update public.payments set amount = 1 where invoice_id = $1", [inv]), "append-only");
    await expectError(db.query("delete from public.payments where invoice_id = $1", [inv]), "append-only");
  });

  it("financial changes are recorded in the audit log", async () => {
    const inv = await draftInvoice();
    await issue(inv);
    const log = await db.query("select action, changed_fields from public.audit_logs where table_name = 'invoices' and record_id = $1 order by id", [inv]);
    expect(log.rows[0].action).toBe("insert");
    expect(log.rows.some((r) => r.changed_fields?.includes("invoice_number"))).toBe(true);
  });

  it("clients see issued invoices of their own client only, never drafts", async () => {
    const draft = await draftInvoice();
    const issued = await draftInvoice();
    await issue(issued);
    const other = await draftInvoice(f.clients.c2);
    await issue(other);
    await asUser(db, f.users.client1Admin, async (tx) => {
      const ids = (await tx.query("select id from public.invoices")).rows.map((r) => r.id);
      expect(ids).toContain(issued);
      expect(ids).not.toContain(draft);
      expect(ids).not.toContain(other);
    });
    await asUser(db, f.users.client1Viewer, async (tx) => {
      expect((await tx.query("select count(*)::int n from public.invoices")).rows[0].n).toBe(0);
    });
  });
});

describe("rates", () => {
  it("wage rates cannot overlap and are immutable", async () => {
    const contract = (await db.query(
      "insert into public.employment_contracts (agency_id, worker_id, contract_number, contract_kind, start_date) values ($1, $2, $3, 'fixed_term', '2027-01-01') returning id",
      [f.agencyA, f.workers.emp1, "EC-" + Date.now()],
    )).rows[0].id;
    const rate = (await db.query(
      "insert into public.wage_rates (agency_id, worker_id, contract_id, hourly_gross, effective_from) values ($1, $2, $3, 15.00, '2027-01-01') returning id",
      [f.agencyA, f.workers.emp1, contract],
    )).rows[0].id;
    await expectError(
      db.query("insert into public.wage_rates (agency_id, worker_id, contract_id, hourly_gross, effective_from) values ($1, $2, $3, 16.00, '2027-06-01')", [f.agencyA, f.workers.emp1, contract]),
      "conflicting key value violates exclusion constraint",
    );
    await expectError(db.query("update public.wage_rates set hourly_gross = 99 where id = $1", [rate]), "immutable");
    await db.query("update public.wage_rates set effective_to = '2027-05-31' where id = $1", [rate]);
    await db.query("insert into public.wage_rates (agency_id, worker_id, contract_id, hourly_gross, effective_from) values ($1, $2, $3, 16.00, '2027-06-01')", [f.agencyA, f.workers.emp1, contract]);
    await asUser(db, f.users.workerEmp1, async (tx) => {
      expect((await tx.query("select count(*)::int n from public.wage_rates")).rows[0].n).toBe(2);
    });
    await asUser(db, f.users.workerEmp2, async (tx) => {
      expect((await tx.query("select count(*)::int n from public.wage_rates")).rows[0].n).toBe(0);
    });
  });

  it("rate snapshots are immutable", async () => {
    const s = await createShift(db, f, { start: "2029-01-01T08:00:00Z", end: "2029-01-01T16:00:00Z" });
    const inv = await inviteWorker(db, f, s, f.workers.emp2);
    const a = await asUserCommit(db, f.users.workerEmp2, async (tx) => (await tx.query("select public.respond_to_shift_invitation($1, true) id", [inv])).rows[0].id);
    await db.query(
      "insert into public.shift_rate_snapshots (agency_id, assignment_id, client_hourly_rate, worker_pay_basis, worker_hourly_amount) values ($1, $2, 32.40, 'employee_wage', 15.00)",
      [f.agencyA, a],
    );
    await expectError(db.query("update public.shift_rate_snapshots set client_hourly_rate = 1 where assignment_id = $1", [a]), "append-only");
  });
});

describe("timesheets", () => {
  async function timesheet() {
    const start = new Date(Date.UTC(2029, 2, 1 + Math.floor(Math.random() * 300), 8)).toISOString();
    const end = new Date(new Date(start).getTime() + 8 * 3600_000).toISOString();
    const s = await createShift(db, f, { start, end });
    const inv = await inviteWorker(db, f, s, f.workers.emp1);
    const a = await asUserCommit(db, f.users.workerEmp1, async (tx) => (await tx.query("select public.respond_to_shift_invitation($1, true) id", [inv])).rows[0].id);
    return (await db.query(
      `insert into public.timesheets (agency_id, assignment_id, shift_id, worker_id, client_id, location_id, scheduled_start, scheduled_end, actual_start, actual_end, break_minutes, worked_minutes, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8, 30, 450, 'draft') returning id`,
      [f.agencyA, a, s.shift, f.workers.emp1, f.clients.c1, f.locations.c1Main, start, end],
    )).rows[0].id as string;
  }

  it("unauthorised users cannot approve timesheets", async () => {
    const ts = await timesheet();
    await db.query("update public.timesheets set status = 'submitted' where id = $1", [ts]);
    for (const user of [f.users.workerEmp1, f.users.client2Admin, f.users.recruiterA, f.users.client1Viewer]) {
      await asUser(db, user, async (tx) => {
        const r = await tx.query("update public.timesheets set status = 'client_approved', client_approved_at = now() where id = $1", [ts]);
        expect(r.rowCount, user).toBe(0);
      });
    }
  });

  it("agency approval requires prior client approval", async () => {
    const ts = await timesheet();
    await db.query("update public.timesheets set status = 'submitted' where id = $1", [ts]);
    await expectError(db.query("update public.timesheets set status = 'agency_approved', agency_approved_at = now() where id = $1", [ts]), "Invalid timesheet transition");
  });

  it("approved timesheets cannot be silently modified", async () => {
    const ts = await timesheet();
    await db.query("update public.timesheets set status = 'submitted' where id = $1", [ts]);
    await db.query("update public.timesheets set status = 'client_approved', client_approved_at = now() where id = $1", [ts]);
    await expectError(db.query("update public.timesheets set worked_minutes = 600 where id = $1", [ts]), "submit a correction");
    await expectError(
      db.query("insert into public.timesheet_entries (agency_id, timesheet_id, entry_kind, minutes) values ($1, $2, 'regular', 60)", [f.agencyA, ts]),
      "Only adjustment entries",
    );
    await expectError(db.query("delete from public.timesheets where id = $1", [ts]), "cannot be deleted");
  });

  it("attendance events use server time and are append-only", async () => {
    const ts = await timesheet();
    const a = (await db.query("select assignment_id from public.timesheets where id = $1", [ts])).rows[0].assignment_id;
    const ev = await db.query(
      `insert into public.attendance_events (agency_id, assignment_id, worker_id, event_type, server_recorded_at, device_recorded_at, is_offline_sync, source, idempotency_key)
       values ($1, $2, $3, 'check_in', '2000-01-01', '2029-03-01T07:58:00Z', true, 'worker_app', 'k1') returning server_recorded_at`,
      [f.agencyA, a, f.workers.emp1],
    );
    expect(new Date(ev.rows[0].server_recorded_at).getFullYear()).toBeGreaterThan(2020);
    await expectError(db.query("update public.attendance_events set event_type = 'check_out' where assignment_id = $1", [a]), "append-only");
    await expectError(
      db.query(
        "insert into public.attendance_events (agency_id, assignment_id, worker_id, event_type, source, idempotency_key) values ($1, $2, $3, 'check_in', 'worker_app', 'k1')",
        [f.agencyA, a, f.workers.emp1],
      ),
      "duplicate key",
    );
  });
});

describe("freelancer purchase invoices", () => {
  it("freelancer submissions are forced to 'submitted' and cannot be self-approved", async () => {
    const biz = (await db.query("insert into public.freelancer_businesses (agency_id, worker_id, trade_name) values ($1, $2, 'Free Co') returning id", [f.agencyA, f.workers.free1])).rows[0].id;
    await asUser(db, f.users.workerFree1, async (tx) => {
      const r = await tx.query(
        `insert into public.freelancer_invoices (agency_id, business_id, worker_id, supplier_invoice_number, invoice_date, subtotal, vat_rate, vat_amount, total, payee_iban, payee_name, status, approved_at, submitted_by)
         values ($1, $2, $3, 'F-001', current_date, 100, 21, 21, 121, 'NL91ABNA0417164300', 'Free Co', 'approved', now(), $4) returning id, status, approved_at`,
        [f.agencyA, biz, f.workers.free1, f.users.workerFree1],
      );
      expect(r.rows[0].status).toBe("submitted");
      expect(r.rows[0].approved_at).toBeNull();
      expect((await tx.query("update public.freelancer_invoices set status = 'approved' where id = $1", [r.rows[0].id])).rowCount).toBe(0);
    });
    await asUser(db, f.users.workerEmp1, async (tx) => {
      expect((await tx.query("select count(*)::int n from public.freelancer_invoices")).rows[0].n).toBe(0);
    });
  });
});
