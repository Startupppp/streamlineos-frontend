import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { toast } from "sonner";
import { ArchivedOrgsRestore } from "./archived-orgs-restore";
import { SESSION_CLAIMS_UNCONFIRMED_MESSAGE } from "@/hooks/common/use-confirmed-session-claims-refresh";

interface RestoreResult {
  success: boolean;
  orgId: string;
}

type RestoreOptions = {
  onSuccess: (data: RestoreResult) => Promise<void> | void;
  onError: (error: Error) => void;
};

const restoreCalls: RestoreOptions[] = [];
const mockRefreshSessionClaims = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock("@/hooks/api/organization", () => ({
  useArchivedOrganizations: () => ({
    data: [{ id: "org-b", name: "Archived Co" }],
    isLoading: false,
  }),
  useRestoreOrg: () => ({
    isPending: false,
    variables: undefined,
    mutate: (_orgId: string, options: RestoreOptions) => {
      restoreCalls.push(options);
    },
  }),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useSessionClaimsRefresh: () => mockRefreshSessionClaims,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh, push: jest.fn() }),
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

function renderRestore() {
  render(<ArchivedOrgsRestore />, { wrapper: Wrapper });
}

async function clickRestore() {
  const button = screen.getAllByRole("button", { name: "Restore" })[0];
  if (!button) throw new Error("Restore button not rendered");
  await act(async () => {
    button.click();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  restoreCalls.length = 0;
  client = new QueryClient();
  clearSpy = jest.spyOn(client, "clear").mockReturnValue(undefined);
});

describe("restoring an archived organization only releases the cache once the session names that org", () => {
  it("clears the cache and navigates when the refreshed session carries the restored org", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWithOrg("org-b"));
    renderRestore();
    await clickRestore();

    await act(async () => {
      await restoreCalls[0]?.onSuccess({ success: true, orgId: "org-b" });
    });

    expect(mockRefreshSessionClaims).toHaveBeenCalledWith({ orgId: "org-b" });
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps the cache and stays put when the refresh times out", async () => {
    mockRefreshSessionClaims.mockResolvedValue(null);
    renderRestore();
    await clickRestore();

    await act(async () => {
      await restoreCalls[0]?.onSuccess({ success: true, orgId: "org-b" });
    });

    expect(clearSpy).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    );
  });

  it("keeps the cache when the refreshed session names a different organization", async () => {
    mockRefreshSessionClaims.mockResolvedValue(sessionWithOrg("org-a"));
    renderRestore();
    await clickRestore();

    await act(async () => {
      await restoreCalls[0]?.onSuccess({ success: true, orgId: "org-b" });
    });

    expect(clearSpy).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      SESSION_CLAIMS_UNCONFIRMED_MESSAGE,
    );
  });

  it("ignores a refresh that lands after a newer restore was started", async () => {
    let settleFirst: ((session: Session) => void) | undefined;
    mockRefreshSessionClaims
      .mockImplementationOnce(
        () =>
          new Promise<Session>((resolve) => {
            settleFirst = resolve;
          }),
      )
      .mockResolvedValue(sessionWithOrg("org-c"));

    renderRestore();
    await clickRestore();
    const firstSuccess = restoreCalls[0]?.onSuccess({
      success: true,
      orgId: "org-b",
    });

    await clickRestore();
    await act(async () => {
      await restoreCalls[1]?.onSuccess({ success: true, orgId: "org-c" });
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);

    await act(async () => {
      settleFirst?.(sessionWithOrg("org-b"));
      await firstSuccess;
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
