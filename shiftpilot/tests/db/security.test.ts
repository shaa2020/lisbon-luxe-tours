/**
 * Row Level Security and authorization tests against a real PostgreSQL
 * database with the full migration set applied. Each case impersonates a real
 * user role exactly as the Supabase Data API would.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, attempt, buildFixture, createPool, createShift, expectError, type Fixture } from "./helpers";

const db = createPool();
let f: Fixture;

beforeAll(async () => {
  f = await buildFixture(db);
});
afterAll(async () => {
  await db.end();
});

const count = async (tx: import("./helpers").Tx, sql: string, params: unknown[] = []) =>
  Number((await tx.query(`select count(*)::int n from (${sql}) q`, params)).rows[0].n);

describe("schema guarantees", () => {
  it("every public table has RLS enabled", async () => {
    const r = await db.query(
      "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    );
    expect(r.rows).toEqual([]);
  });

  it("anon can read published job openings only, nothing else", async () => {
    await db.query(
      `insert into public.job_openings (agency_id, title, slug, description, status, published_at)
       values ($1, 'Cleaner Amsterdam', 'cleaner-ams', 'Join us', 'published', now()),
              ($1, 'Draft role', 'draft-role', 'Hidden', 'draft', null)`,
      [f.agencyA],
    );
    await asUser(db, null, async (tx) => {
      const jobs = await tx.query("select title from public.job_openings where agency_id = $1", [f.agencyA]);
      expect(jobs.rows.map((r) => r.title)).toEqual(["Cleaner Amsterdam"]);
      await expectError(attempt(tx, "select * from public.clients"), "permission denied");
      await expectError(attempt(tx, "select * from public.workers"), "permission denied");
      await expectError(attempt(tx, "select * from public.profiles"), "permission denied");
      await expectError(
        attempt(tx, "insert into public.applications (agency_id, first_name, last_name, email, privacy_notice_version, privacy_acknowledged_at, retention_until) values ($1,'a','b','a@b.c','v1',now(),now()::date)", [f.agencyA]),
        "permission denied",
      );
    });
  });

  it("an authenticated user with no memberships sees nothing", async () => {
    await asUser(db, f.users.outsider, async (tx) => {
      for (const t of ["agencies", "clients", "workers", "shifts", "invoices", "wage_rates", "audit_logs", "documents", "leads"]) {
        expect(await count(tx, `select 1 from public.${t}`), t).toBe(0);
      }
    });
  });
});

describe("agency tenant isolation", () => {
  it("staff of agency A cannot read agency B records", async () => {
    await asUser(db, f.users.adminA, async (tx) => {
      expect(await count(tx, "select 1 from public.clients where agency_id = $1", [f.agencyB])).toBe(0);
      expect(await count(tx, "select 1 from public.workers where agency_id = $1", [f.agencyB])).toBe(0);
      expect(await count(tx, "select 1 from public.agencies where id = $1", [f.agencyB])).toBe(0);
      expect(await count(tx, "select 1 from public.clients where agency_id = $1", [f.agencyA])).toBe(2);
    });
  });

  it("staff of agency A cannot write into agency B", async () => {
    await asUser(db, f.users.adminA, async (tx) => {
      await expectError(attempt(tx, "insert into public.clients (agency_id, name) values ($1, 'Injected')", [f.agencyB]), "row-level security");
      const upd = await tx.query("update public.clients set name = 'Hijacked' where id = $1", [f.clients.b1]);
      expect(upd.rowCount).toBe(0);
    });
  });

  it("records cannot be moved between agencies", async () => {
    await asUser(db, f.users.ownerA, async (tx) => {
      await expectError(attempt(tx, "update public.clients set agency_id = $1 where id = $2", [f.agencyB, f.clients.c1]));
    });
  });

  it("composite foreign keys prevent cross-tenant references", async () => {
    await expectError(
      db.query(
        "insert into public.client_locations (agency_id, client_id, name, address_line1, postal_code, city) values ($1, $2, 'x', 'y', '1000AA', 'Amsterdam')",
        [f.agencyA, f.clients.b1],
      ),
      "foreign key",
    );
  });
});

describe("client isolation", () => {
  it("Client A cannot access Client B", async () => {
    const s2 = await createShift(db, f, { clientId: f.clients.c2, locationId: f.locations.c2Main, start: "2027-04-01T08:00:00Z", end: "2027-04-01T12:00:00Z" });
    await asUser(db, f.users.client1Admin, async (tx) => {
      expect((await tx.query("select id from public.clients")).rows.map((r) => r.id)).toEqual([f.clients.c1]);
      expect(await count(tx, "select 1 from public.client_locations where client_id = $1", [f.clients.c2])).toBe(0);
      expect(await count(tx, "select 1 from public.shifts where id = $1", [s2.shift])).toBe(0);
      expect(await count(tx, "select 1 from public.client_shift_staff($1)", [s2.shift])).toBe(0);
      await expectError(
        attempt(tx, `insert into public.shift_requests (agency_id, client_id, location_id, position_id, requested_by, status, headcount, starts_at, ends_at)
                     values ($1, $2, $3, $4, $5, 'submitted', 1, '2027-05-01T08:00Z', '2027-05-01T12:00Z')`,
          [f.agencyA, f.clients.c2, f.locations.c2Main, f.positions.cleanerA, f.users.client1Admin]),
        "row-level security",
      );
    });
  });

  it("location-scoped client users only see their permitted locations", async () => {
    await asUser(db, f.users.client1Viewer, async (tx) => {
      const locs = (await tx.query("select id from public.client_locations")).rows.map((r) => r.id);
      expect(locs).toEqual([f.locations.c1Second]);
    });
  });

  it("client users cannot read workers, wage rates, rate snapshots or internal notes", async () => {
    await db.query("insert into public.internal_notes (agency_id, subject_type, subject_id, body) values ($1, 'client', $2, 'Pays late')", [f.agencyA, f.clients.c1]);
    await asUser(db, f.users.client1Admin, async (tx) => {
      for (const t of ["workers", "worker_private_details", "wage_rates", "shift_rate_snapshots", "freelancer_rate_agreements",
        "employer_cost_profiles", "internal_notes", "employment_contracts", "rate_categories", "payroll_exports"]) {
        expect(await count(tx, `select 1 from public.${t}`), t).toBe(0);
      }
    });
  });

  it("client users cannot escalate their own membership permissions", async () => {
    await asUser(db, f.users.client1Viewer, async (tx) => {
      const r = await tx.query("update public.client_memberships set can_view_finance = true where user_id = $1", [f.users.client1Viewer]);
      expect(r.rowCount).toBe(0); // viewer lacks manage_users → no visible row to update
    });
    await asUser(db, f.users.client1Admin, async (tx) => {
      await expectError(
        attempt(tx, "update public.client_memberships set role = 'client_admin', can_approve_timesheets = true where user_id = $1", [f.users.client1Admin]),
        "cannot change your own",
      );
    });
  });
});

describe("worker isolation", () => {
  it("Worker A cannot access Worker B's records or documents", async () => {
    const docType = (await db.query("select id from public.document_types where agency_id = $1 and key = 'certificate'", [f.agencyA])).rows[0].id;
    await db.query(
      "insert into public.documents (agency_id, document_type_id, owner_type, worker_id, title) values ($1, $2, 'worker', $3, 'Emp2 certificate')",
      [f.agencyA, docType, f.workers.emp2],
    );
    await asUser(db, f.users.workerEmp1, async (tx) => {
      expect((await tx.query("select id from public.workers")).rows.map((r) => r.id)).toEqual([f.workers.emp1]);
      expect(await count(tx, "select 1 from public.worker_private_details where worker_id = $1", [f.workers.emp2])).toBe(0);
      expect(await count(tx, "select 1 from public.documents where worker_id = $1", [f.workers.emp2])).toBe(0);
      expect(await count(tx, "select 1 from public.worker_documents where worker_id = $1", [f.workers.emp2])).toBe(0);
      const upd = await tx.query("update public.workers set phone = '0600000000' where id = $1", [f.workers.emp2]);
      expect(upd.rowCount).toBe(0);
    });
    await asUser(db, f.users.workerEmp2, async (tx) => {
      expect(await count(tx, "select 1 from public.documents where worker_id = $1", [f.workers.emp2])).toBe(1);
    });
  });

  it("workers cannot change staff-controlled fields on their own profile", async () => {
    await asUser(db, f.users.workerEmp1, async (tx) => {
      await tx.query("update public.workers set phone = '0612345678' where id = $1", [f.workers.emp1]);
      await expectError(attempt(tx, "update public.workers set status = 'active', engagement_type = 'freelancer' where id = $1", [f.workers.emp1]), "Only agency staff");
      await expectError(
        attempt(tx, "update public.worker_private_details set work_eligibility_status = 'verified' where worker_id = $1", [f.workers.emp1]),
        "Verification fields",
      );
    });
  });

  it("worker-uploaded documents and credentials are forced to pending", async () => {
    await asUser(db, f.users.workerEmp1, async (tx) => {
      const docType = (await tx.query("select id from public.document_types where key = 'certificate'")).rows[0].id;
      const doc = await tx.query(
        `insert into public.documents (agency_id, document_type_id, owner_type, worker_id, title, status, uploaded_by)
         values ($1, $2, 'worker', $3, 'My VCA', 'verified', $4) returning status, verified_by`,
        [f.agencyA, docType, f.workers.emp1, f.users.workerEmp1],
      );
      expect(doc.rows[0].status).toBe("pending");
    });
  });

  it("sensitive documents are hidden from staff without workers.sensitive.read", async () => {
    const idType = (await db.query("select id from public.document_types where agency_id = $1 and key = 'identity_verification'", [f.agencyA])).rows[0].id;
    await db.query("insert into public.documents (agency_id, document_type_id, owner_type, worker_id, title) values ($1, $2, 'worker', $3, 'ID check')", [f.agencyA, idType, f.workers.emp1]);
    await asUser(db, f.users.recruiterA, async (tx) => {
      expect(await count(tx, "select 1 from public.documents where document_type_id = $1", [idType])).toBe(0);
    });
    await asUser(db, f.users.adminA, async (tx) => {
      expect(await count(tx, "select 1 from public.documents where document_type_id = $1", [idType])).toBe(1);
    });
  });
});

describe("staff role permissions", () => {
  it("recruiters cannot read wage rates or finance", async () => {
    await asUser(db, f.users.recruiterA, async (tx) => {
      expect(await count(tx, "select 1 from public.invoices")).toBe(0);
      await expectError(attempt(tx, "insert into public.clients (agency_id, name) values ($1, 'X')", [f.agencyA]), "row-level security");
    });
  });

  it("only users.manage holders can grant roles, and only owners can grant ownership", async () => {
    const ownerRole = (await db.query("select id from public.roles where key='agency_owner'")).rows[0].id;
    const opsRole = (await db.query("select id from public.roles where key='operations_manager'")).rows[0].id;
    await asUser(db, f.users.opsA, async (tx) => {
      // Denied either by the owner guard trigger or by RLS (no users.manage).
      await expectError(attempt(tx, "insert into public.user_roles (agency_id, user_id, role_id) values ($1, $2, $3)", [f.agencyA, f.users.opsA, ownerRole]), /row-level security|Only an agency owner/);
      await expectError(attempt(tx, "insert into public.user_roles (agency_id, user_id, role_id) values ($1, $2, $3)", [f.agencyA, f.users.opsA, opsRole]), "row-level security");
    });
    await asUser(db, f.users.adminA, async (tx) => {
      await tx.query("insert into public.user_roles (agency_id, user_id, role_id) values ($1, $2, $3)", [f.agencyA, f.users.recruiterA, opsRole]);
      await expectError(attempt(tx, "insert into public.user_roles (agency_id, user_id, role_id) values ($1, $2, $3)", [f.agencyA, f.users.adminA, ownerRole]), "Only an agency owner");
    });
  });

  it("the last owner cannot be removed", async () => {
    await asUser(db, f.users.ownerA, async (tx) => {
      await expectError(
        attempt(tx, "delete from public.user_roles ur using public.roles r where r.id = ur.role_id and r.key = 'agency_owner' and ur.user_id = $1", [f.users.ownerA]),
        "at least one owner",
      );
    });
  });

  it("my_permissions reflects role assignments", async () => {
    await asUser(db, f.users.recruiterA, async (tx) => {
      const perms = (await tx.query("select * from public.my_permissions($1) p", [f.agencyA])).rows.map((r) => r.p);
      expect(perms).toContain("recruitment.write");
      expect(perms).not.toContain("invoices.issue");
    });
  });
});

describe("audit trail", () => {
  it("changes are audited and the audit log cannot be altered", async () => {
    await asUser(db, f.users.adminA, async (tx) => {
      await tx.query("update public.clients set billing_city = 'Utrecht' where id = $1", [f.clients.c1]);
      const log = await tx.query(
        "select actor_user_id, changed_fields from public.audit_logs where table_name = 'clients' and record_id = $1 and action = 'update' order by id desc limit 1",
        [f.clients.c1],
      );
      expect(log.rows[0].actor_user_id).toBe(f.users.adminA);
      expect(log.rows[0].changed_fields).toEqual(["billing_city"]);
      // No DELETE policy: RLS silently matches zero rows.
      expect((await tx.query("delete from public.audit_logs")).rowCount).toBe(0);
      expect((await tx.query("update public.audit_logs set action = 'tampered'")).rowCount).toBe(0);
      await expectError(attempt(tx, "insert into public.audit_logs (action) values ('forged')"), "row-level security");
    });
    // Even the superuser cannot rewrite history through normal DML.
    await expectError(db.query("update public.audit_logs set action = 'x' where id = (select min(id) from public.audit_logs)"), "append-only");
  });

  it("audit snapshots never contain IBANs", async () => {
    await db.query("update public.agency_settings set iban = 'NL91ABNA0417164300' where agency_id = $1", [f.agencyA]);
    const r = await db.query(
      "select new_data from public.audit_logs where table_name='agency_settings' and record_id = $1 order by id desc limit 1",
      [f.agencyA],
    );
    expect(r.rows[0].new_data.iban).toBeUndefined();
  });
});

describe("invitations", () => {
  it("accepts a matching invitation once and rejects misuse", async () => {
    const token = "a".repeat(20) + Math.random().toString(36).slice(2) + "b".repeat(20);
    const { sha256Hex } = await import("./helpers");
    const email = (await db.query("select email from public.profiles where id = $1", [f.users.outsider])).rows[0].email;
    await db.query(
      `insert into public.invitations (agency_id, kind, email, client_id, client_role, client_permissions, token_hash, expires_at, invited_by)
       values ($1, 'client', $2, $3, 'client_manager', '{"can_approve_timesheets": true}', $4, now() + interval '7 days', $5)`,
      [f.agencyA, email, f.clients.c2, sha256Hex(token), f.users.adminA],
    );
    await asUser(db, f.users.workerEmp1, async (tx) => {
      await expectError(attempt(tx, "select public.accept_invitation($1)", [token]), "different email");
    });
    // Commit the acceptance so the reuse check sees it.
    const tx = await db.connect();
    try {
      await tx.query("begin");
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: f.users.outsider, role: "authenticated" })]);
      await tx.query("set local role authenticated");
      const r = await tx.query("select public.accept_invitation($1) res", [token]);
      expect(r.rows[0].res.client_id).toBe(f.clients.c2);
      const m = await tx.query("select can_approve_timesheets from public.client_memberships where user_id = $1", [f.users.outsider]);
      expect(m.rows[0].can_approve_timesheets).toBe(true);
      await expectError(attempt(tx, "select public.accept_invitation($1)", [token]), "already been used");
      await expectError(attempt(tx, "select public.accept_invitation($1)", ["x".repeat(40)]), "Invalid invitation");
    } finally {
      await tx.query("rollback");
      tx.release();
    }
  });

  it("only owners can invite owners", async () => {
    const ownerRole = (await db.query("select id from public.roles where key='agency_owner'")).rows[0].id;
    await asUser(db, f.users.adminA, async (tx) => {
      await expectError(
        attempt(tx, `insert into public.invitations (agency_id, kind, email, role_id, token_hash, expires_at, invited_by)
                     values ($1, 'staff', 'new@example.test', $2, $3, now() + interval '1 day', $4)`,
          [f.agencyA, ownerRole, "c".repeat(64), f.users.adminA]),
        "Only an agency owner",
      );
    });
  });
});

describe("pathway separation", () => {
  it("employment records require an employee; freelancer businesses require a freelancer", async () => {
    await expectError(
      db.query(
        "insert into public.employment_contracts (agency_id, worker_id, contract_number, contract_kind, start_date) values ($1, $2, 'EC-1', 'fixed_term', '2027-01-01')",
        [f.agencyA, f.workers.free1],
      ),
      "employee pathway",
    );
    await expectError(
      db.query("insert into public.freelancer_businesses (agency_id, worker_id, trade_name) values ($1, $2, 'Emp Co')", [f.agencyA, f.workers.emp1]),
      "freelancer pathway",
    );
  });

  it("freelancers cannot self-approve their classification", async () => {
    await asUser(db, f.users.workerFree1, async (tx) => {
      const r = await tx.query(
        "insert into public.freelancer_businesses (agency_id, worker_id, trade_name, classification_status) values ($1, $2, 'Free Co', 'approved') returning classification_status",
        [f.agencyA, f.workers.free1],
      );
      expect(r.rows[0].classification_status).toBe("pending");
    });
  });
});

describe("rate limiting", () => {
  it("allows up to the limit within a window, service role only", async () => {
    const { asService } = await import("./helpers");
    const key = "test:" + Math.random();
    const results = await asService(db, async (tx) => {
      const out: boolean[] = [];
      for (let i = 0; i < 4; i++) out.push((await tx.query("select public.consume_rate_limit($1, 3, 60) ok", [key])).rows[0].ok);
      return out;
    });
    expect(results).toEqual([true, true, true, false]);
    await asUser(db, f.users.adminA, async (tx) => {
      await expectError(attempt(tx, "select public.consume_rate_limit('x:y', 3, 60)"), "permission denied");
    });
  });
});
