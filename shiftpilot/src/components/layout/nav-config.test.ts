import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ADMIN_NAV, CLIENT_NAV, WORKER_NAV, filterNav } from "./nav-config";

describe("navigation", () => {
  it("filters admin items by permission", () => {
    const nav = filterNav(ADMIN_NAV, new Set(["dashboard.view", "audit.read"]));
    expect(nav.flatMap((s) => s.items.map((i) => i.href))).toEqual(["/admin", "/admin/audit-log"]);
  });

  it("drops empty sections", () => {
    expect(filterNav(ADMIN_NAV, new Set())).toEqual([]);
  });

  it("every navigation link points to an implemented page (no dead links)", () => {
    const appDir = path.resolve(__dirname, "../../app");
    const routeFile = (href: string) => {
      const portal = href.split("/")[1];
      const rest = href.split("/").slice(2).join("/");
      return path.join(appDir, `(portals)`, portal, rest, "page.tsx");
    };
    for (const s of [...ADMIN_NAV, ...CLIENT_NAV, ...WORKER_NAV]) {
      for (const i of s.items) expect(fs.existsSync(routeFile(i.href)), i.href).toBe(true);
    }
  });
});
