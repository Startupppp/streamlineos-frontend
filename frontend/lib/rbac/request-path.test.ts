import { resolveRequestPath } from "./request-path";

function makeHeaders(values: Record<string, string | undefined>) {
  return {
    get(name: string) {
      return values[name] ?? null;
    },
  };
}

describe("resolveRequestPath", () => {
  it("uses the exact proxy pathname instead of the referring page", () => {
    expect(
      resolveRequestPath(
        makeHeaders({
          "x-pathname": "/me/expenses",
          referer: "https://app.streamlineos.test/dashboard",
        }),
      ),
    ).toBe("/me/expenses");
  });

  it("uses Next route headers before Referer when the proxy header is absent", () => {
    expect(
      resolveRequestPath(
        makeHeaders({
          "next-url": "/settings/roles?tab=members",
          referer: "https://app.streamlineos.test/dashboard",
        }),
      ),
    ).toBe("/settings/roles");
  });

  it("falls back to the Referer pathname", () => {
    expect(
      resolveRequestPath(
        makeHeaders({ referer: "https://app.streamlineos.test/dashboard?welcome=true" }),
      ),
    ).toBe("/dashboard");
  });

  it("returns null when no route information is available", () => {
    expect(resolveRequestPath(makeHeaders({}))).toBeNull();
  });
});
