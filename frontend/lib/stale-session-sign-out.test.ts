import { signOutStaleSession } from "./stale-session-sign-out";

const mockSignOut = jest.fn();
jest.mock("next-auth/react", () => ({ signOut: (...args: unknown[]) => mockSignOut(...args) }));
jest.mock("@/lib/query-cache-control", () => ({ clearRegisteredQueryCache: jest.fn() }));

const assign = jest.fn();

describe("signOutStaleSession", () => {
  beforeEach(() => {
    assign.mockReset();
    mockSignOut.mockReset();
    Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true });
  });

  it("drops the Auth.js session and lands on the expired-session sign-in page", async () => {
    mockSignOut.mockResolvedValue(undefined);
    await signOutStaleSession();
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(assign).toHaveBeenCalledWith("/signin?session=expired");
  });

  it("still reaches sign-in when the Auth.js sign-out call fails", async () => {
    mockSignOut.mockRejectedValue(new Error("network"));
    await signOutStaleSession();
    expect(assign).toHaveBeenCalledWith("/signin?session=expired");
  });
});
