import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { proxy } from "./proxy";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

const mockedGetToken = getToken as jest.Mock;

function request(url: string): NextRequest {
  return new NextRequest(
    new Request(url, { headers: { cookie: "authjs.session-token=stale-but-decodable" } }),
  );
}

describe("proxy with a decodable session cookie the backend may no longer honour", () => {
  beforeEach(() => {
    mockedGetToken.mockResolvedValue({ id: "u1", sessionId: "s1", isActive: true });
  });

  it("still sends an ordinary /signin visit on to the dashboard", async () => {
    const res = await proxy(request("https://app.test/signin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.test/dashboard");
  });

  it("serves /signin?session=expired and expires the stale cookie instead of bouncing to /dashboard", async () => {
    const res = await proxy(request("https://app.test/signin?session=expired"));
    expect(res.headers.get("location")).toBeNull();
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("authjs.session-token=;");
    expect(setCookie).toMatch(/Max-Age=0/i);
  });
});
