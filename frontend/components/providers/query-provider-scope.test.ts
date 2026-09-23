import { authenticatedScope } from "@/lib/query-scope";
import { resolveQueryProviderScope } from "./query-provider";

describe("resolveQueryProviderScope", () => {
  const serverScope = authenticatedScope("org-1", "user-1");

  it("keeps the server-authenticated scope while the client session is loading", () => {
    expect(
      resolveQueryProviderScope({
        initialScope: serverScope,
        status: "loading",
        orgId: undefined,
        userId: undefined,
      }),
    ).toBe(serverScope);
  });

  it("switches to the resolved authenticated identity", () => {
    expect(
      resolveQueryProviderScope({
        initialScope: serverScope,
        status: "authenticated",
        orgId: "org-2",
        userId: "user-2",
      }),
    ).toBe(authenticatedScope("org-2", "user-2"));
  });
});
