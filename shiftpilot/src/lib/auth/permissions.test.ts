import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PERMISSIONS, SYSTEM_ROLES, hasAll, hasAny } from "./permissions";

const migration = fs.readFileSync(
  path.resolve(__dirname, "../../../supabase/migrations/20261116000002_identity_access.sql"),
  "utf8",
);

describe("permission catalogue", () => {
  it("matches the database permission seed exactly", () => {
    const block = migration.slice(migration.indexOf("insert into public.permissions"), migration.indexOf("insert into public.roles"));
    const dbKeys = [...block.matchAll(/\('([a-z_.]+)', '[a-z_]+', '/g)].map((m) => m[1]);
    expect(dbKeys.length).toBeGreaterThan(30);
    expect([...dbKeys].sort()).toEqual([...PERMISSIONS].sort());
  });

  it("matches the database system roles exactly", () => {
    const block = migration.slice(migration.indexOf("insert into public.roles"), migration.indexOf("insert into public.role_permissions"));
    const dbRoles = [...block.matchAll(/\('([a-z_]+)', '[^']+', '[^']+', true\)/g)].map((m) => m[1]);
    expect([...dbRoles].sort()).toEqual([...SYSTEM_ROLES].sort());
  });

  it("evaluates hasAll / hasAny", () => {
    const granted = new Set(["shifts.read", "shifts.write"]);
    expect(hasAll(granted, ["shifts.read", "shifts.write"])).toBe(true);
    expect(hasAll(granted, ["shifts.read", "invoices.issue"])).toBe(false);
    expect(hasAny(granted, ["invoices.issue", "shifts.write"])).toBe(true);
    expect(hasAny(granted, [])).toBe(true);
  });
});
