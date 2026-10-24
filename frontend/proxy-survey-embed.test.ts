/** @jest-environment node */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { proxy } from "./proxy";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

const mockedGetToken = getToken as jest.Mock;
const fetchMock = jest.fn();

function embedOriginsResponse(allowedOrigins: unknown[]) {
  return { ok: true, json: async () => ({ success: true, data: { allowedOrigins } }) };
}

function frameAncestors(res: Response): string | undefined {
  return res.headers
    .get("content-security-policy")
    ?.split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("frame-ancestors"));
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
  mockedGetToken.mockResolvedValue(null);
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

describe("survey respondent pages are frameable only by the origins their embed link lists", () => {
  it("lets an allowlisted site frame an embed link", async () => {
    fetchMock.mockResolvedValue(embedOriginsResponse(["https://acme.example", "https://shop.acme.example"]));

    const res = await proxy(new NextRequest("https://app.test/s/tok-1?embed=1"));

    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe("https://api.example.test/public/surveys/tok-1/embed-origin");
    expect(frameAncestors(res)).toBe("frame-ancestors https://acme.example https://shop.acme.example");
    expect(res.headers.get("x-frame-options")).toBeNull();
  });

  it("keeps a plain survey link unframeable and never asks the API", async () => {
    const res = await proxy(new NextRequest("https://app.test/s/tok-1"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(frameAncestors(res)).toBe("frame-ancestors 'none'");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("drops anything that is not an https origin, and stays unframeable when nothing is left", async () => {
    fetchMock.mockResolvedValue(embedOriginsResponse(["*", "http://acme.example", "https://acme.example/path"]));

    const res = await proxy(new NextRequest("https://app.test/s/tok-1?embed=1"));

    expect(frameAncestors(res)).toBe("frame-ancestors 'none'");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("stays unframeable when the API refuses the token", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    const res = await proxy(new NextRequest("https://app.test/s/unknown?embed=1"));

    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("never opens framing for an app page that carries the embed flag", async () => {
    mockedGetToken.mockResolvedValue({ id: "u1", sessionId: "s1", isActive: true });

    const res = await proxy(new NextRequest("https://app.test/surveys?embed=1"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });
});
