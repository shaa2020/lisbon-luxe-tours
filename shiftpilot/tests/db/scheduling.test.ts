/**
 * Scheduling integrity: state machine, double-booking, headcount and real
 * concurrent acceptance across separate database connections.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, attempt, buildFixture, createPool, createShift, expectError, inviteWorker, type Fixture } from "./helpers";

const db = createPool();
let f: Fixture;
let day = 0;
/** A fresh, non-overlapping time window per test. */
function window(hours = 8) {
  day += 1;
  const start = new Date(Date.UTC(2028, 0, 1 + day, 8));
  const end = new Date(start.getTime() + hours * 3600_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

beforeAll(async () => {
  f = await buildFixture(db);
});
afterAll(async () => {
  await db.end();
});

describe("shift state machine", () => {
  it("rejects invalid transitions and records valid ones", async () => {
    const s = await createShift(db, f, { ...window(), status: "draft" });
    await expectError(db.query("update public.shifts set status = 'completed' where id = $1", [s.shift]), "Invalid shift transition: draft → completed");
    await db.query("update public.shifts set status = 'open' where id = $1", [s.shift]);
    const hist = await db.query("select from_state, to_state from public.state_transitions where entity_id = $1 order by id", [s.shift]);
    expect(hist.rows).toEqual([
      { from_state: null, to_state: "draft" },
      { from_state: "draft", to_state: "open" },
    ]);
  });

  it("new records must start in an initial state", async () => {
    await expectError(createShift(db, f, { ...window(), status: "invoiced" }), "cannot start in state invoiced");
  });

  it("cancelling a shift cancels live assignments and withdraws invitations", async () => {
    const s = await createShift(db, f, { ...window(), headcount: 2 });
    const inv = await inviteWorker(db, f, s, f.workers.emp1);
    await inviteWorker(db, f, s, f.workers.emp2);
    await asUserCommit(db, f.users.workerEmp1, (tx) => tx.query("select public.respond_to_shift_invitation($1, true)", [inv]));
    await db.query("update public.shifts set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Client closed' where id = $1", [s.shift]);
    const a = await db.query("select status from public.shift_assignments where shift_id = $1", [s.shift]);
    expect(a.rows.map((r) => r.status)).toEqual(["cancelled"]);
    const i = await db.query("select status from public.shift_invitations where shift_id = $1 order by status", [s.shift]);
    expect(i.rows.map((r) => r.status).sort()).toEqual(["accepted", "withdrawn"]);
  });
});

describe("assignments and acceptance", () => {
  it("accepting an invitation creates an assignment and advances the shift fill status", async () => {
    const s = await createShift(db, f, window());
    const inv = await inviteWorker(db, f, s, f.workers.emp1);
    expect((await db.query("select status from public.shifts where id = $1", [s.shift])).rows[0].status).toBe("offered");
    const assignment = await asUserCommit(db, f.users.workerEmp1, async (tx) =>
      (await tx.query("select public.respond_to_shift_invitation($1, true) id", [inv])).rows[0].id as string,
    );
    const row = (await db.query("select status, starts_at, ends_at from public.shift_assignments where id = $1", [assignment])).rows[0];
    expect(row.status).toBe("accepted");
    expect(new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()).toBe(8 * 3600_000);
    expect((await db.query("select status from public.shifts where id = $1", [s.shift])).rows[0].status).toBe("filled");
    expect((await db.query("select filled_count from public.shift_positions where id = $1", [s.position])).rows[0].filled_count).toBe(1);
  });

  it("duplicate shift acceptance is rejected", async () => {
    const s = await createShift(db, f, { ...window(), headcount: 3 });
    const inv = await inviteWorker(db, f, s, f.workers.emp1);
    await asUserCommit(db, f.users.workerEmp1, (tx) => tx.query("select public.respond_to_shift_invitation($1, true)", [inv]));
    await asUser(db, f.users.workerEmp1, async (tx) => {
      await expectError(attempt(tx, "select public.respond_to_shift_invitation($1, true)", [inv]), "no longer open");
    });
    // A second invitation for the same worker and shift cannot produce a second assignment.
    const inv2 = await inviteWorker(db, f, s, f.workers.emp1);
    await asUser(db, f.users.workerEmp1, async (tx) => {
      await expectError(attempt(tx, "select public.respond_to_shift_invitation($1, true)", [inv2]), /already assigned|overlaps/);
    });
  });

  it("conflicting (overlapping) assignments are rejected", async () => {
    const w = window(8);
    const s1 = await createShift(db, f, w);
    const overlapStart = new Date(new Date(w.start).getTime() + 4 * 3600_000).toISOString();
    const overlapEnd = new Date(new Date(w.start).getTime() + 10 * 3600_000).toISOString();
    const s2 = await createShift(db, f, { start: overlapStart, end: overlapEnd, clientId: f.clients.c2, locationId: f.locations.c2Main });
    const i1 = await inviteWorker(db, f, s1, f.workers.emp2);
    const i2 = await inviteWorker(db, f, s2, f.workers.emp2);
    await asUserCommit(db, f.users.workerEmp2, (tx) => tx.query("select public.respond_to_shift_invitation($1, true)", [i1]));
    await asUser(db, f.users.workerEmp2, async (tx) => {
      await expectError(attempt(tx, "select public.respond_to_shift_invitation($1, true)", [i2]), "overlaps");
    });
  });

  it("rescheduling a shift into a conflict is rejected", async () => {
    const w1 = window(4);
    const w2 = window(4);
    const s1 = await createShift(db, f, w1);
    const s2 = await createShift(db, f, w2);
    const i1 = await inviteWorker(db, f, s1, f.workers.emp1);
    const i2 = await inviteWorker(db, f, s2, f.workers.emp1);
    await asUserCommit(db, f.users.workerEmp1, (tx) => tx.query("select public.respond_to_shift_invitation($1, true)", [i1]));
    await asUserCommit(db, f.users.workerEmp1, (tx) => tx.query("select public.respond_to_shift_invitation($1, true)", [i2]));
    await expectError(
      db.query("update public.shifts set starts_at = $2, ends_at = $3 where id = $1", [s2.shift, w1.start, w1.end]),
      "no_double_booking",
    );
  });

  it("headcount can never be exceeded", async () => {
    const s = await createShift(db, f, window());
    const i1 = await inviteWorker(db, f, s, f.workers.emp1);
    const i2 = await inviteWorker(db, f, s, f.workers.emp2);
    await asUserCommit(db, f.users.workerEmp1, (tx) => tx.query("select public.respond_to_shift_invitation($1, true)", [i1]));
    await asUser(db, f.users.workerEmp2, async (tx) => {
      await expectError(attempt(tx, "select public.respond_to_shift_invitation($1, true)", [i2]), "fully staffed");
    });
  });

  it("concurrent acceptance of the last slot: exactly one succeeds", async () => {
    const s = await createShift(db, f, window());
    const i1 = await inviteWorker(db, f, s, f.workers.emp1);
    const i2 = await inviteWorker(db, f, s, f.workers.free1);
    const results = await Promise.allSettled([
      asUserCommit(db, f.users.workerEmp1, (tx) => tx.query("select public.respond_to_shift_invitation($1, true)", [i1])),
      asUserCommit(db, f.users.workerFree1, (tx) => tx.query("select public.respond_to_shift_invitation($1, true)", [i2])),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(String(rejected.reason.message)).toMatch(/fully staffed/);
    const live = await db.query("select count(*)::int n from public.shift_assignments where shift_id = $1 and status = 'accepted'", [s.shift]);
    expect(live.rows[0].n).toBe(1);
  });

  it("workers cannot accept invitations that belong to someone else", async () => {
    const s = await createShift(db, f, window());
    const inv = await inviteWorker(db, f, s, f.workers.emp1);
    await asUser(db, f.users.workerEmp2, async (tx) => {
      await expectError(attempt(tx, "select public.respond_to_shift_invitation($1, true)", [inv]), "not found");
    });
  });

  it("positions enforce the permitted engagement pathway", async () => {
    const s = await createShift(db, f, { ...window(), engagements: ["employee"] });
    await expectError(
      db.query(
        "insert into public.shift_assignments (agency_id, shift_id, shift_position_id, worker_id, status, starts_at, ends_at) values ($1,$2,$3,$4,'invited',now(),now()+interval '1h')",
        [f.agencyA, s.shift, s.position, f.workers.free1],
      ),
      "not open to freelancer",
    );
  });

  it("workers cannot write assignments directly", async () => {
    const s = await createShift(db, f, window());
    await asUser(db, f.users.workerEmp1, async (tx) => {
      await expectError(
        attempt(tx, "insert into public.shift_assignments (agency_id, shift_id, shift_position_id, worker_id, status, starts_at, ends_at, created_by) values ($1,$2,$3,$4,'confirmed',now(),now()+interval '1h',$5)",
          [f.agencyA, s.shift, s.position, f.workers.emp1, f.users.workerEmp1]),
        "row-level security",
      );
    });
  });
});

describe("client requests", () => {
  it("clients can submit requests and cancel them, but not approve them", async () => {
    const w = window(4);
    await asUser(db, f.users.client1Admin, async (tx) => {
      const r = await tx.query(
        `insert into public.shift_requests (agency_id, client_id, location_id, position_id, requested_by, status, headcount, starts_at, ends_at, break_minutes)
         values ($1, $2, $3, $4, $5, 'submitted', 5, $6, $7, 15) returning id`,
        [f.agencyA, f.clients.c1, f.locations.c1Main, f.positions.cleanerA, f.users.client1Admin, w.start, w.end],
      );
      const id = r.rows[0].id;
      await expectError(attempt(tx, "update public.shift_requests set status = 'accepted' where id = $1", [id]), /row-level security|only be cancelled/);
      await tx.query("update public.shift_requests set status = 'cancelled', cancellation_reason = 'No longer needed' where id = $1", [id]);
    });
  });

  it("client users without the request capability cannot create requests", async () => {
    const w = window(4);
    await asUser(db, f.users.client1Viewer, async (tx) => {
      await expectError(
        attempt(tx, `insert into public.shift_requests (agency_id, client_id, location_id, position_id, requested_by, status, headcount, starts_at, ends_at)
                     values ($1, $2, $3, $4, $5, 'submitted', 1, $6, $7)`,
          [f.agencyA, f.clients.c1, f.locations.c1Second, f.positions.cleanerA, f.users.client1Viewer, w.start, w.end]),
        "row-level security",
      );
    });
  });

  it("clients see only privacy-preserving staff details", async () => {
    const s = await createShift(db, f, window());
    const inv = await inviteWorker(db, f, s, f.workers.emp1);
    await asUserCommit(db, f.users.workerEmp1, (tx) => tx.query("select public.respond_to_shift_invitation($1, true)", [inv]));
    await asUser(db, f.users.client1Admin, async (tx) => {
      const staff = await tx.query("select * from public.client_shift_staff($1)", [s.shift]);
      expect(staff.rows).toHaveLength(1);
      expect(Object.keys(staff.rows[0]).sort()).toEqual(["assignment_id", "position_name", "status", "worker_display_name"]);
      expect(staff.rows[0].worker_display_name).toBe("WA-001 T.");
      expect((await tx.query("select count(*)::int n from public.shift_assignments")).rows[0].n).toBe(0);
    });
  });
});
