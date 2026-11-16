import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("landing page renders with sign-in entry point", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Run your staffing agency");
    await page.getByRole("link", { name: "Sign in to ShiftPilot" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("privacy notice is reachable", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy notice" })).toBeVisible();
    await expect(page.getByText("does not store BSN numbers")).toBeVisible();
  });

  test("unknown pages return 404", async ({ page }) => {
    const res = await page.goto("/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});

test.describe("access control", () => {
  for (const path of ["/admin", "/admin/settings/team", "/client", "/worker", "/portal", "/account"]) {
    test(`${path} redirects signed-out visitors to login with a safe return path`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/[/]/g, "%2F")}`));
    });
  }

  test("reset-password without a recovery session is rejected", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page).toHaveURL(/\/login\?error=link/);
    await expect(page.getByText("invalid or has expired")).toBeVisible();
  });

  test("invalid invitation links are refused", async ({ page }) => {
    await page.goto("/invite/not-a-valid-token");
    await expect(page.getByRole("heading", { name: "Invitation unavailable" })).toBeVisible();
  });

  test("sign-out rejects cross-origin posts (CSRF)", async ({ request }) => {
    const res = await request.post("/auth/signout", { headers: { Origin: "https://evil.example" }, maxRedirects: 0 });
    expect(res.status()).toBe(403);
  });
});

test.describe("forms", () => {
  test("login validates input before contacting the auth server", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByText("Enter your password")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });

  test("forgot-password validates the email", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
  });
});

test.describe("security headers", () => {
  test("pages send a nonce-based CSP and hardening headers", async ({ request }) => {
    const res = await request.get("/login");
    const h = res.headers();
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("each request gets a fresh nonce", async ({ request }) => {
    const a = (await request.get("/login")).headers()["content-security-policy"];
    const b = (await request.get("/login")).headers()["content-security-policy"];
    expect(a).not.toEqual(b);
  });

  test("pages run without CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && /Content Security Policy/i.test(m.text())) violations.push(m.text());
    });
    await page.goto("/login");
    await page.getByLabel("Email").fill("a@b.nl");
    expect(violations).toEqual([]);
  });

  test("the PWA manifest is served", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.name).toBe("ShiftPilot");
    expect(m.display).toBe("standalone");
  });
});

test.describe("responsive layout", () => {
  test("login card fits the viewport without horizontal scroll", async ({ page }) => {
    await page.goto("/login");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
