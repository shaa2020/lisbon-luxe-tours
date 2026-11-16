import { describe, expect, it } from "vitest";
import { fieldErrors, newPasswordSchema, passwordSchema, signInSchema } from "./auth";

describe("auth validation", () => {
  it("normalises email and requires a password", () => {
    const r = signInSchema.safeParse({ email: "  Anna@Example.NL ", password: "x" });
    expect(r.success && r.data.email).toBe("anna@example.nl");
    const bad = signInSchema.safeParse({ email: "nope", password: "" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(fieldErrors(bad.error)).toMatchObject({ email: expect.any(String), password: expect.any(String) });
  });

  it("enforces password length and variety", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("aaaaaaaaaaaaaaaa").success).toBe(false);
    expect(passwordSchema.safeParse("correct horse battery").success).toBe(true);
  });

  it("requires matching confirmation", () => {
    const r = newPasswordSchema.safeParse({ password: "correct horse battery", confirm: "different horse" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).confirm).toBe("Passwords do not match");
  });
});
