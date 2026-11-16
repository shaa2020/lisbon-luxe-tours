import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("email adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reports not_configured without credentials and never calls the network", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { sendEmail } = await import("./email");
    const r = await sendEmail({ to: "a@b.nl", subject: "s", html: "h", text: "t", idempotencyKey: "k" });
    expect(r).toEqual({ status: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("only reports sent when the provider returns a message id", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "ShiftPilot <no-reply@example.nl>");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "msg_1" }), { status: 200 })));
    const { sendEmail } = await import("./email");
    expect(await sendEmail({ to: "a@b.nl", subject: "s", html: "h", text: "t", idempotencyKey: "k" })).toEqual({ status: "sent", providerMessageId: "msg_1" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 })));
    expect(await sendEmail({ to: "a@b.nl", subject: "s", html: "h", text: "t", idempotencyKey: "k2" })).toEqual({ status: "failed", error: "domain not verified" });
  });

  it("escapes user-controlled content in HTML", async () => {
    const { invitationEmail } = await import("./email");
    const m = invitationEmail({ agencyName: "<script>x</script>", inviterName: "A&B", link: "https://x.nl/invite/abc", audience: "agency team" });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.html).toContain("A&amp;B");
  });
});
