jest.mock("server-only", () => ({}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const cookieJar: { name: string; value: string }[] = [];
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => new Headers({ "x-pathname": "/org-setup" })),
  cookies: jest.fn(async () => ({ getAll: () => cookieJar })),
}));

jest.mock("@/lib/get-server-auth", () => ({ getServerAuth: jest.fn(async () => null) }));
jest.mock("@/lib/rbac/get-server-access", () => ({ getServerAccessResult: jest.fn() }));

import { requirePermission, requireSession } from "@/lib/rbac/require-permission";

async function signInRedirect(run: () => Promise<unknown>): Promise<URL> {
  const error = await run().then(
    () => null,
    (e: Error) => e,
  );
  return new URL(String(error?.message).replace("REDIRECT:", ""), "http://local");
}

describe("sending a person with no session to sign in", () => {
  beforeEach(() => {
    cookieJar.length = 0;
  });

  it("does not say the session expired when there was never a session cookie, for example right after signing out", async () => {
    const target = await signInRedirect(() => requireSession());

    expect(target.pathname).toBe("/signin");
    expect(target.searchParams.get("session")).toBeNull();
  });

  it("still says the session expired when a stale session cookie was sent", async () => {
    cookieJar.push({ name: "authjs.session-token", value: "stale" });

    const target = await signInRedirect(() => requirePermission("sign:envelope:view"));

    expect(target.searchParams.get("session")).toBe("expired");
  });
});
