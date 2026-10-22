/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import {
  legacyRedirectHits,
  resetLegacyRedirectCounts,
} from "@/lib/observability/legacy-redirect";

function request(url: string): NextRequest {
  return new NextRequest(new Request(url));
}

describe("proxy observes the code-owned compatibility redirects", () => {
  let origInfo: typeof console.info;

  beforeEach(() => {
    resetLegacyRedirectCounts();
    origInfo = console.info;
    console.info = (): void => {};
  });

  afterEach(() => {
    console.info = origInfo;
    resetLegacyRedirectCounts();
  });

  it("keeps the code-owned redirect inventory exact", () => {
    const source = readFileSync(resolve(process.cwd(), "proxy.ts"), "utf8");
    const observedSources = [
      ...source.matchAll(/recordLegacyRedirect\("([^"]+)"/g),
    ].map((match) => match[1]);

    expect(observedSources).toEqual(["/projects", "/product-management", "/knowledge"]);
  });

  it("still redirects /projects into /build with the search preserved", async () => {
    const res = await proxy(request("https://app.test/projects/7/issues?type=BUG"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://app.test/build/7/issues?type=BUG",
    );
  });

  it("counts a /projects hit so the redirect's traffic is observable", async () => {
    expect(legacyRedirectHits("/projects")).toBe(0);
    await proxy(request("https://app.test/projects/7"));
    expect(legacyRedirectHits("/projects")).toBe(1);
    await proxy(request("https://app.test/projects"));
    expect(legacyRedirectHits("/projects")).toBe(2);
  });

  it("still redirects /product-management into /build and counts it separately", async () => {
    const res = await proxy(request("https://app.test/product-management/roadmap"));
    expect(res.headers.get("location")).toBe("https://app.test/build/roadmap");
    expect(legacyRedirectHits("/product-management")).toBe(1);
    expect(legacyRedirectHits("/projects")).toBe(0);
  });

  it("redirects /knowledge to Docs home and counts the hit so the compatibility entry is observable", async () => {
    const res = await proxy(request("https://app.test/knowledge?ref=bookmark"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.test/knowledge/wiki?ref=bookmark");
    expect(legacyRedirectHits("/knowledge")).toBe(1);
  });

  it("leaves Docs child routes alone and counts nothing for them", async () => {
    const res = await proxy(request("https://app.test/knowledge/wiki"));
    expect(res.headers.get("location")).not.toBe("https://app.test/knowledge/wiki");
    expect(legacyRedirectHits("/knowledge")).toBe(0);
  });

  it("counts nothing for a path that is not a legacy Build family", async () => {
    await proxy(request("https://app.test/signup"));
    expect(legacyRedirectHits("/projects")).toBe(0);
    expect(legacyRedirectHits("/product-management")).toBe(0);
  });

  it("keeps the post-invite resolver behind sign-in and its callback on the same origin", async () => {
    const response = await proxy(request("https://app.test/post-invite?callbackUrl=https://external.test"));
    const location = response.headers.get("location");
    expect(location).not.toBeNull();
    const destination = new URL(location ?? "https://app.test");
    expect(destination.origin).toBe("https://app.test");
    expect(destination.pathname).toBe("/signin");
    expect(destination.searchParams.get("callbackUrl")).toBe(
      "/post-invite?callbackUrl=https://external.test",
    );
  });
});

describe("public Calendar pages", () => {
  it.each([
    "/calendar/book/booking-token",
    "/calendar/polls/poll-token",
    "/calendar/invitations/rsvp?token=invitation-token",
    "/calendar/invitations/join?token=invitation-token",
  ])("allows an anonymous visitor to open %s", async (path) => {
    const response = await proxy(request(`https://app.test${path}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each([
    "/calendar",
    "/calendar/book/booking-token/manage",
    "/calendar/invitations/admin",
  ])("keeps %s behind sign-in", async (path) => {
    const response = await proxy(request(`https://app.test${path}`));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "https://app.test").pathname).toBe("/signin");
  });
});


const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
const originalInternalUrl = process.env.API_INTERNAL_URL;
const originalFetch = global.fetch;

function calendarRequest(path: string): NextRequest {
  return request(`https://app.test${path}`);
}


describe("public Calendar embed response headers", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.test";
    delete process.env.API_INTERNAL_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    if (originalInternalUrl === undefined) delete process.env.API_INTERNAL_URL;
    else process.env.API_INTERNAL_URL = originalInternalUrl;
  });

  it("allows only the configured origin to frame an active embed link", async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { allowedOrigin: "https://partner.test" },
    }), { status: 200 }));
    const response = await proxy(calendarRequest("/calendar/book/valid-token"));
    expect(global.fetch).toHaveBeenCalledWith(
      new URL("https://api.test/public/calendar/booking/valid-token/embed-origin"),
      expect.objectContaining({ cache: "no-store", redirect: "error" }),
    );
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors https://partner.test");
    expect(response.headers.get("x-frame-options")).toBeNull();
  });

  it.each(["https://partner.test/path", "http://partner.test", "https://partner.test; script-src *", null])(
    "rejects an invalid configured origin %s",
    async (allowedOrigin) => {
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
        success: true,
        data: { allowedOrigin },
      }), { status: 200 }));
      const response = await proxy(calendarRequest("/calendar/book/invalid-token"));
      expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      expect(response.headers.get("x-frame-options")).toBe("DENY");
    },
  );

  it("fails closed when the policy read is unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("unavailable"));
    const response = await proxy(calendarRequest("/calendar/book/unavailable-token"));
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("keeps all other public pages non-framable", async () => {
    global.fetch = jest.fn();
    const response = await proxy(calendarRequest("/calendar/polls/poll-token"));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});
