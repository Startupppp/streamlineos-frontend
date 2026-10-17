/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { STAFF_ENTRY_COOKIE, staffEntryCookieValue } from "@/lib/waitlist-staff";

function request(url: string, cookie?: string): NextRequest {
  return new NextRequest(new Request(url, cookie ? { headers: { cookie } } : undefined));
}

describe("waitlist mode route lockdown", () => {
  const previousMode = process.env.WAITLIST_MODE;
  const previousKey = process.env.WAITLIST_STAFF_KEY;

  beforeEach(() => {
    process.env.WAITLIST_MODE = "true";
    delete process.env.WAITLIST_STAFF_KEY;
  });

  afterEach(() => {
    if (previousMode === undefined) delete process.env.WAITLIST_MODE;
    else process.env.WAITLIST_MODE = previousMode;
    if (previousKey === undefined) delete process.env.WAITLIST_STAFF_KEY;
    else process.env.WAITLIST_STAFF_KEY = previousKey;
  });

  it.each([
    "/signin",
    "/signin/",
    "/SignIn",
    "/sign-in",
    "/signup",
    "/sign-up",
    "/login",
    "/LOGIN",
    "/register",
    "/join",
    "/get-started",
    "/dashboard",
    "/build",
    "/payroll",
  ])("sends %s to /waitlist", async (path) => {
    const response = await proxy(request(`https://app.test${path}?utm_source=ads&ref=keep`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.test/waitlist?utm_source=ads");
  });

  it("leaves public pages and invitation routes reachable", async () => {
    for (const path of ["/pricing", "/magic-link", "/verify-email", "/invitation/abc", "/legal/privacy"]) {
      const response = await proxy(request(`https://app.test${path}`));
      expect(response.status).not.toBe(307);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("lets a valid staff cookie through to /signin", async () => {
    process.env.WAITLIST_STAFF_KEY = "staff-secret";
    const value = await staffEntryCookieValue("staff-secret");
    const response = await proxy(
      request("https://app.test/signin?utm_source=ads", `${STAFF_ENTRY_COOKIE}=${value}`),
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps today's sign-in redirect when the flag is off", async () => {
    process.env.WAITLIST_MODE = "false";
    const signup = await proxy(request("https://app.test/signup"));
    expect(signup.headers.get("location")).toBe("https://app.test/signin");
    const dashboard = await proxy(request("https://app.test/dashboard"));
    expect(new URL(dashboard.headers.get("location") ?? "").pathname).toBe("/signin");
  });
});
