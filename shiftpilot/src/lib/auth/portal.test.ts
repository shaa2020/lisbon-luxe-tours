import { describe, expect, it } from "vitest";
import { availablePortals, resolveLanding, safeNextPath, type MembershipSummary } from "./portal";

const empty: MembershipSummary = { staffAgencies: [], clientMemberships: [], workerProfiles: [] };

describe("portal resolution", () => {
  it("sends single-portal users straight to their portal", () => {
    expect(resolveLanding({ ...empty, staffAgencies: [{ agencyId: "a", agencyName: "A", roles: ["recruiter"] }] })).toBe("/admin");
    expect(resolveLanding({ ...empty, clientMemberships: [{ clientId: "c", clientName: "C", agencyId: "a" }] })).toBe("/client");
    expect(resolveLanding({ ...empty, workerProfiles: [{ workerId: "w", agencyId: "a", status: "active", engagementType: "employee" }] })).toBe("/worker");
  });

  it("asks multi-portal users to choose and gives no-access users no portal", () => {
    const both: MembershipSummary = {
      ...empty,
      staffAgencies: [{ agencyId: "a", agencyName: "A", roles: [] }],
      workerProfiles: [{ workerId: "w", agencyId: "a", status: "onboarding", engagementType: "freelancer" }],
    };
    expect(availablePortals(both)).toEqual(["admin", "worker"]);
    expect(resolveLanding(both)).toBeNull();
    expect(availablePortals(empty)).toEqual([]);
    expect(resolveLanding(empty)).toBeNull();
  });

  it("ignores archived worker profiles", () => {
    expect(availablePortals({ ...empty, workerProfiles: [{ workerId: "w", agencyId: "a", status: "archived", engagementType: "employee" }] })).toEqual([]);
  });
});

describe("safeNextPath (open-redirect protection)", () => {
  it.each([
    ["/admin/shifts?x=1", "/admin/shifts?x=1"],
    ["/worker#next", "/worker#next"],
    ["https://evil.example/", "/portal"],
    ["//evil.example/path", "/portal"],
    ["/\\evil.example", "/portal"],
    ["javascript:alert(1)", "/portal"],
    ["/ok\r\nSet-Cookie: x", "/portal"],
    [null, "/portal"],
    ["", "/portal"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input as string | null)).toBe(expected);
  });
});
