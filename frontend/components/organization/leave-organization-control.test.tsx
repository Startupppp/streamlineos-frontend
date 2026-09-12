import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { toast } from "sonner";
import { LeaveOrganizationDialog } from "./leave-organization-control";
import { SESSION_CLAIMS_UNCONFIRMED_MESSAGE } from "@/hooks/common/use-confirmed-session-claims-refresh";

interface LeaveResult {
  success: boolean;
  nextOrgId?: string;
}

interface LeaveOptions {
  onSuccess: (data: LeaveResult) => Promise<void> | void;
  onError: (error: Error) => void;
}

const leaveCalls: LeaveOptions[] = [];
const mockRefreshSessionClaims = jest.fn();
const mockReplace = jest.fn();
const onOpenChange = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { isOrgOwner: false } }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useLeaveOrg: () => ({
    isPending: false,
    mutate: (_input: undefined, options: LeaveOptions) => {
      leaveCalls.push(options);
    },
  }),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useSessionClaimsRefresh: () => mockRefreshSessionClaims,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: jest.fn(), push: jest.fn() }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockToastError = toast.error as jest.Mock;

function sessionWithOrg(orgId: string | null): Session {
  return {
    user: { id: "user-1", role: "MEMBER", name: "Ada" },
    orgId,
    expires: "2099-01-01T00:00:00.000Z",
  };
}

let client: QueryClient;
let clearSpy: jest.SpyInstance;

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function confirmLeave() {
  const button = screen.getByRole("button", { name: "Leave Organization" });
  await act(async () => {
    button.click();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  leaveCalls.length = 0;
  client = new QueryClient();
  clearSpy = jest.spyOn(client, "clear").mockReturnValue(undefined);
});

describe("leaving the last organization only releases the cache once the session has no org", () => {
  it("clears the cache and sends the member to org setup when the session confirms no org", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWithOrg(null));
    render(
      <LeaveOrganizationDialog open onOpenChange={onOpenChange} />,
      { wrapper: Wrapper },
    );
    await confirmLeave();

    await act(async () => {
      await leaveCalls[0]?.onSuccess({ success: true });
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: null });
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/org-setup");
  });

  it("sends the member to the dashboard of the org the backend moved them into", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWithOrg("org-b"));
    render(
      <LeaveOrganizationDialog open onOpenChange={onOpenChange} />,
      { wrapper: Wrapper },
    );
    await confirmLeave();

    await act(async () => {
      await leaveCalls[0]?.onSuccess({ success: true, nextOrgId: "org-b" });
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: "org-b" });
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps the cache when the session still names the organization just left", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWithOrg("org-a"));
    render(
      <LeaveOrganizationDialog open onOpenChange={onOpenChange} />,
      { wrapper: Wrapper },
    );
    await confirmLeave();

    await act(async () => {
      await leaveCalls[0]?.onSuccess({ success: true });
    });

    expect(clearSpy).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    );
  });

  it("keeps the cache when the refresh times out", async () => {
    mockRefreshSessionClaims.mockResolvedValue(null);
    render(
      <LeaveOrganizationDialog open onOpenChange={onOpenChange} />,
      { wrapper: Wrapper },
    );
    await confirmLeave();

    await act(async () => {
      await leaveCalls[0]?.onSuccess({ success: true });
    });

    expect(clearSpy).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    );
  });
});
