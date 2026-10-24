/** @jest-environment node */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { proxy } from "./proxy";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

const mockedGetToken = getToken as jest.Mock;
const SIGNING_TOKEN = "31473f7572b92a8ba4f3b680217ffc97bb6ae09d5a127dcbf3e2e0f8919a8c7d";

beforeEach(() => {
  mockedGetToken.mockReset();
  mockedGetToken.mockResolvedValue(null);
});

describe("a signer opens the emailed signing link without an account", () => {
  it("serves the signing page to a signed-out signer instead of redirecting to sign-in", async () => {
    const res = await proxy(new NextRequest(`https://app.test/sign/${SIGNING_TOKEN}`));

    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("does not read the session cookie for a signing link", async () => {
    await proxy(new NextRequest(`https://app.test/sign/${SIGNING_TOKEN}`));

    expect(mockedGetToken).not.toHaveBeenCalled();
  });

  it("still sends a signed-out visitor of the Sign module to sign-in", async () => {
    const res = await proxy(new NextRequest("https://app.test/sign/envelopes"));

    expect(res.headers.get("location")).toContain("/signin?callbackUrl=%2Fsign%2Fenvelopes");
  });

  it("still protects an envelope page, whose id is not a signing token", async () => {
    const res = await proxy(new NextRequest("https://app.test/sign/envelopes/12"));

    expect(res.headers.get("location")).toContain("/signin");
  });

  it("does not treat a short or non-hex segment under /sign as a signing link", async () => {
    const res = await proxy(new NextRequest("https://app.test/sign/reports"));

    expect(res.headers.get("location")).toContain("/signin");
  });
});
