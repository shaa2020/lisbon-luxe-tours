/**
 * Database test helpers.
 *
 * Tests connect as the PostgreSQL superuser to build fixtures (which bypasses
 * RLS, like the Supabase service role), then impersonate real API users by
 * switching to the `authenticated` / `anon` role and setting the JWT claims
 * exactly the way PostgREST does. Every impersonated block runs inside a
 * transaction that is rolled back, so tests never leak state.
 */
import { randomUUID, createHash, randomBytes } from "node:crypto";
import pg from "pg";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/shiftpilot_test";

export function createPool() {
  return new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 6 });
}

export type Db = pg.Pool;
export type Tx = pg.PoolClient;

export class PgError extends Error {
  constructor(
    message: string,
    public code: string | undefined,
  ) {
    super(message);
  }
}

/** Run `fn` as an authenticated user (or anon when userId is null). Always rolls back. */
export async function asUser<T>(db: Db, userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const tx = await db.connect();
  try {
    await tx.query("begin");
    if (userId) {
      await tx.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
      await tx.query("set local role authenticated");
    } else {
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "anon" })]);
      await tx.query("set local role anon");
    }
    return await fn(tx);
  } finally {
    await tx.query("rollback").catch(() => undefined);
    tx.release();
  }
}

/** Like asUser but commits — used for concurrency tests that need real commits. */
export async function asUserCommit<T>(db: Db, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const tx = await db.connect();
  try {
    await tx.query("begin");
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    await tx.query("set local role authenticated");
    const result = await fn(tx);
    await tx.query("commit");
    return result;
  } catch (e) {
    await tx.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    tx.release();
  }
}

/** Run as the service role (bypasses RLS, but `auth.role()` = service_role). */
export async function asService<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const tx = await db.connect();
  try {
    await tx.query("begin");
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "service_role" })]);
    await tx.query("set local role service_role");
    const r = await fn(tx);
    await tx.query("commit");
    return r;
  } catch (e) {
    await tx.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    tx.release();
  }
}

/** Expect a query to fail; returns the error. */
export async function expectError(p: Promise<unknown>, match?: RegExp | string): Promise<PgError> {
  try {
    await p;
  } catch (e) {
    const err = e as { message: string; code?: string };
    if (match) {
      const ok = typeof match === "string" ? err.message.includes(match) : match.test(err.message);
      if (!ok) throw new Error(`Expected error matching ${match}, got: ${err.message}`);
    }
    return new PgError(err.message, err.code);
  }
  throw new Error(`Expected query to fail${match ? ` with ${match}` : ""}, but it succeeded`);
}

/** Savepoint wrapper so an expected failure doesn't abort the surrounding transaction. */
export async function attempt(tx: Tx, sql: string, params: unknown[] = []) {
  const sp = "sp_" + randomBytes(4).toString("hex");
  await tx.query(`savepoint ${sp}`);
  try {
    const r = await tx.query(sql, params);
    await tx.query(`release savepoint ${sp}`);
    return r;
  } catch (e) {
    await tx.query(`rollback to savepoint ${sp}`);
    throw e;
  }
}

export function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
export interface Fixture {
  agencyA: string;
  agencyB: string;
  users: Record<
    | "ownerA"
    | "adminA"
    | "opsA"
    | "recruiterA"
    | "financeA"
    | "invoiceDrafterA"
    | "ownerB"
    | "client1Admin"
    | "client1Viewer"
    | "client2Admin"
    | "clientB1Admin"
    | "workerEmp1"
    | "workerEmp2"
    | "workerFree1"
    | "workerB1"
    | "outsider",
    string
  >;
  clients: { c1: string; c2: string; b1: string };
  locations: { c1Main: string; c1Second: string; c2Main: string; b1Main: string };
  workers: { emp1: string; emp2: string; free1: string; b1: string };
  positions: { cleanerA: string; cleanerB: string };
}

async function createUser(db: Db, label: string): Promise<string> {
  const id = randomUUID();
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    id,
    `${label.toLowerCase()}-${id.slice(0, 8)}@example.test`,
    JSON.stringify({ full_name: label }),
  ]);
  return id;
}

async function roleId(db: Db, key: string): Promise<string> {
  const r = await db.query("select id from public.roles where key = $1 and agency_id is null", [key]);
  return r.rows[0].id;
}

export async function buildFixture(db: Db): Promise<Fixture> {
  const labels = [
    "ownerA", "adminA", "opsA", "recruiterA", "financeA", "invoiceDrafterA", "ownerB",
    "client1Admin", "client1Viewer", "client2Admin", "clientB1Admin",
    "workerEmp1", "workerEmp2", "workerFree1", "workerB1", "outsider",
  ] as const;
  const users = {} as Fixture["users"];
  for (const l of labels) users[l] = await createUser(db, l);

  const suffix = randomBytes(3).toString("hex");
  const agencyA = (await db.query("select public.bootstrap_agency($1, $2, $3) id", ["Agency A", `agency-a-${suffix}`, users.ownerA])).rows[0].id;
  const agencyB = (await db.query("select public.bootstrap_agency($1, $2, $3) id", ["Agency B", `agency-b-${suffix}`, users.ownerB])).rows[0].id;

  const grant = async (agency: string, user: string, role: string) =>
    db.query("insert into public.user_roles (agency_id, user_id, role_id) values ($1, $2, $3)", [agency, user, await roleId(db, role)]);
  await grant(agencyA, users.adminA, "agency_admin");
  await grant(agencyA, users.opsA, "operations_manager");
  await grant(agencyA, users.recruiterA, "recruiter");
  await grant(agencyA, users.financeA, "finance");

  // Custom role: may draft invoices but NOT issue them.
  const drafter = (await db.query(
    "insert into public.roles (agency_id, key, name, is_system) values ($1, 'invoice_drafter', 'Invoice drafter', false) returning id",
    [agencyA],
  )).rows[0].id;
  await db.query(
    "insert into public.role_permissions (role_id, permission_key) select $1, k from unnest(array['finance.read','finance.write']) k",
    [drafter],
  );
  await db.query("insert into public.user_roles (agency_id, user_id, role_id) values ($1, $2, $3)", [agencyA, users.invoiceDrafterA, drafter]);

  const client = async (agency: string, name: string) =>
    (await db.query("insert into public.clients (agency_id, name, status) values ($1, $2, 'active') returning id", [agency, name])).rows[0].id as string;
  const c1 = await client(agencyA, "Client One");
  const c2 = await client(agencyA, "Client Two");
  const b1 = await client(agencyB, "Client B-One");

  const loc = async (agency: string, clientId: string, name: string) =>
    (await db.query(
      "insert into public.client_locations (agency_id, client_id, name, address_line1, postal_code, city) values ($1, $2, $3, 'Damrak 1', '1012 LG', 'Amsterdam') returning id",
      [agency, clientId, name],
    )).rows[0].id as string;
  const c1Main = await loc(agencyA, c1, "C1 Main");
  const c1Second = await loc(agencyA, c1, "C1 Second");
  const c2Main = await loc(agencyA, c2, "C2 Main");
  const b1Main = await loc(agencyB, b1, "B1 Main");

  const member = async (agency: string, clientId: string, user: string, opts: { approve?: boolean; finance?: boolean; manage?: boolean; request?: boolean } = {}) =>
    (await db.query(
      `insert into public.client_memberships (agency_id, client_id, user_id, role, can_request_staff, can_approve_timesheets, can_view_finance, can_manage_users)
       values ($1, $2, $3, 'client_admin', $4, $5, $6, $7) returning id`,
      [agency, clientId, user, opts.request ?? true, opts.approve ?? false, opts.finance ?? false, opts.manage ?? false],
    )).rows[0].id as string;
  await member(agencyA, c1, users.client1Admin, { approve: true, finance: true, manage: true });
  const viewerMembership = await member(agencyA, c1, users.client1Viewer, { request: false });
  // Viewer restricted to the second location only.
  await db.query(
    "insert into public.client_membership_locations (membership_id, location_id, client_id, agency_id) values ($1, $2, $3, $4)",
    [viewerMembership, c1Second, c1, agencyA],
  );
  await member(agencyA, c2, users.client2Admin, { approve: true, finance: true, manage: true });
  await member(agencyB, b1, users.clientB1Admin, { approve: true, finance: true, manage: true });

  const worker = async (agency: string, user: string, num: string, type: "employee" | "freelancer") =>
    (await db.query(
      `insert into public.workers (agency_id, user_id, worker_number, engagement_type, status, first_name, last_name, email)
       values ($1, $2, $3, $4, 'active', $5, 'Tester', $6) returning id`,
      [agency, user, num, type, `W${num}`, `${num}-${suffix}@example.test`],
    )).rows[0].id as string;
  const emp1 = await worker(agencyA, users.workerEmp1, "A-001", "employee");
  const emp2 = await worker(agencyA, users.workerEmp2, "A-002", "employee");
  const free1 = await worker(agencyA, users.workerFree1, "A-003", "freelancer");
  const wb1 = await worker(agencyB, users.workerB1, "B-001", "employee");

  const position = async (agency: string) => {
    const ind = (await db.query("select id from public.industries where agency_id = $1 and slug = 'cleaning'", [agency])).rows[0].id;
    return (await db.query(
      "insert into public.job_positions (agency_id, industry_id, name, allows_freelancers) values ($1, $2, 'Cleaner', true) returning id",
      [agency, ind],
    )).rows[0].id as string;
  };

  return {
    agencyA,
    agencyB,
    users,
    clients: { c1, c2, b1 },
    locations: { c1Main, c1Second, c2Main, b1Main },
    workers: { emp1, emp2, free1, b1: wb1 },
    positions: { cleanerA: await position(agencyA), cleanerB: await position(agencyB) },
  };
}

/** Create an open shift with one position (as superuser). */
export async function createShift(
  db: Db | Tx,
  f: Fixture,
  opts: { clientId?: string; locationId?: string; start?: string; end?: string; headcount?: number; engagements?: string[]; status?: string } = {},
) {
  const start = opts.start ?? "2027-03-01T08:00:00Z";
  const end = opts.end ?? "2027-03-01T16:00:00Z";
  const shift = (await db.query(
    `insert into public.shifts (agency_id, client_id, location_id, title, starts_at, ends_at, break_minutes, status)
     values ($1, $2, $3, 'Cleaning', $4, $5, 30, $6) returning id`,
    [f.agencyA, opts.clientId ?? f.clients.c1, opts.locationId ?? f.locations.c1Main, start, end, opts.status ?? "open"],
  )).rows[0].id as string;
  const position = (await db.query(
    `insert into public.shift_positions (agency_id, shift_id, position_id, headcount, allowed_engagements)
     values ($1, $2, $3, $4, $5::public.engagement_type[]) returning id`,
    [f.agencyA, shift, f.positions.cleanerA, opts.headcount ?? 1, opts.engagements ?? ["employee", "freelancer"]],
  )).rows[0].id as string;
  return { shift, position };
}

export async function inviteWorker(db: Db | Tx, f: Fixture, shift: { shift: string; position: string }, workerId: string) {
  return (await db.query(
    `insert into public.shift_invitations (agency_id, shift_id, shift_position_id, worker_id, invited_by)
     values ($1, $2, $3, $4, $5) returning id`,
    [f.agencyA, shift.shift, shift.position, workerId, f.users.opsA],
  )).rows[0].id as string;
}
