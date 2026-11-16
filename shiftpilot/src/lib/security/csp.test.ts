import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";

describe("buildCsp", () => {
  it("uses a nonce with strict-dynamic and blocks framing and plugins", () => {
    const csp = buildCsp("abc123", { supabaseUrl: "https://xyz.supabase.co", isDev: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self' https://xyz.supabase.co wss://xyz.supabase.co");
    expect(csp).toContain("upgrade-insecure-requests");
  });
  it("allows eval only in development", () => {
    expect(buildCsp("n", { isDev: true })).toContain("'unsafe-eval'");
  });
});
