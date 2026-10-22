import { render } from "@testing-library/react";
import { SessionProvider } from "./session-provider";

let mockSession: { user?: { id: string }; orgId?: string } = {};
jest.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: () => ({ data: mockSession }),
}));
jest.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
const mockClearBackendTokenCache = jest.fn();
jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: () => mockClearBackendTokenCache(),
  seedBackendToken: jest.fn(),
}));

const reload = jest.fn();
beforeAll(() => {
  Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload, replace: jest.fn() } });
});
beforeEach(() => jest.clearAllMocks());

it("reloads when a different account signs in from another tab", () => {
  mockSession = { user: { id: "owner" }, orgId: "org-1" };
  const { rerender } = render(<SessionProvider>child</SessionProvider>);
  mockSession = { user: { id: "hr-admin" }, orgId: "org-1" };
  rerender(<SessionProvider>child</SessionProvider>);
  expect(mockClearBackendTokenCache).toHaveBeenCalled();
  expect(reload).toHaveBeenCalledTimes(1);
});

it("does not reload on the first sign-in or a claims refresh for the same user", () => {
  mockSession = {};
  const { rerender } = render(<SessionProvider>child</SessionProvider>);
  mockSession = { user: { id: "owner" }, orgId: "org-1" };
  rerender(<SessionProvider>child</SessionProvider>);
  mockSession = { user: { id: "owner" }, orgId: "org-1" };
  rerender(<SessionProvider>child</SessionProvider>);
  expect(reload).not.toHaveBeenCalled();
});
