import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { DEFAULT_DATA } from "@/features/org-setup/lib/constants";

const mockRefreshSessionClaims = jest.fn();
const mockClearAll = jest.fn();
const mockToastError = jest.fn();
const mockLocationReplace = jest.fn();
const mockSetAutoSignOutSuppressed = jest.fn();
let capturedWorkspaceProps: Record<string, unknown> | null = null;

let capturedShellData: { fullName?: string } | null = null;

jest.mock("@/features/org-setup/components/org-setup-shell", () => ({
  OrgSetupShell: ({
    children,
    data,
  }: PropsWithChildren & { data?: { fullName?: string } }) => {
    capturedShellData = data ?? null;
    return <div>{children}</div>;
  },
}));

// The wizard opens on the workspace step: the welcome step and its
// skip-to-dashboard were removed in 02a8c9830.
jest.mock("@/features/org-setup/components/step-workspace", () => ({
  StepWorkspace: (props: Record<string, unknown>) => {
    capturedWorkspaceProps = props;
    return null;
  },
}));

jest.mock("@/features/org-setup/components/step-invite-launch", () => ({
  StepInviteLaunch: () => null,
}));

jest.mock("@/components/organization/archived-orgs-restore", () => ({
  ArchivedOrgsRestore: () => null,
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useSessionClaimsRefresh: jest.fn(() => mockRefreshSessionClaims),
  useMyPendingInvitations: jest.fn(() => ({ data: [] })),
  useClaimInvitation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/org-setup", () => ({
  useOrgSetupSessionQuery: jest.fn(() => ({ data: undefined, isFetched: true })),
  useOrgSetupDraftQuery: jest.fn(() => ({ data: undefined, isFetched: true })),
  useOrgSetupDraftSaveMutation: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

jest.mock("@/features/org-setup/lib/draft", () => ({
  loadDraft: jest.fn(() => ({ ...DEFAULT_DATA })),
  saveDraft: jest.fn(),
  loadStep: jest.fn(() => 1),
  saveStep: jest.fn(),
  clampStep: jest.fn(() => 1),
  reachableStep: jest.fn((step: number) => step),
  hasDraftProgress: jest.fn(() => false),
  hasCompletionMarker: jest.fn(() => false),
  clearAll: jest.fn((...args: unknown[]) => mockClearAll(...args)),
}));

jest.mock("@/lib/api-client", () => ({
  clearBackendTokenCache: jest.fn(),
  setAutoSignOutSuppressed: (...args: unknown[]) => mockSetAutoSignOutSuppressed(...args),
}));

const mockUseSession = jest.fn<unknown, unknown[]>(() => ({
  data: { user: { id: "user-1", name: "Ada" }, orgId: null },
}));

jest.mock("next-auth/react", () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn((...args: unknown[]) => mockToastError(...args)),
    success: jest.fn(),
  },
}));

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { replace: mockLocationReplace },
  });
});

beforeEach(() => {
  mockRefreshSessionClaims.mockReset();
  mockClearAll.mockReset();
  mockToastError.mockReset();
  mockLocationReplace.mockReset();
  mockSetAutoSignOutSuppressed.mockReset();
  capturedWorkspaceProps = null;
  // The banner tests set pending invitations; no later test may inherit them.
  (jest.requireMock("@/hooks/common/auth-hooks") as { useMyPendingInvitations: jest.Mock })
    .useMyPendingInvitations.mockReturnValue({ data: [], isPending: false });
  capturedShellData = null;
  mockUseSession.mockReset().mockReturnValue({
    data: { user: { id: "user-1", name: "Ada" }, orgId: null },
  });
});

import OrgSetupPage from "@/app/org-setup/page";

async function renderWizard() {
  render(<OrgSetupPage />);
  await waitFor(() => {
    expect(capturedWorkspaceProps).not.toBeNull();
  });
}

describe("OrgSetupPage — the wizard opens on the workspace step", () => {
  it("waits for the server draft, then shows workspace as the first step with the archived-org restore", async () => {
    const { useOrgSetupDraftQuery } = jest.requireMock("@/hooks/api/org-setup") as {
      useOrgSetupDraftQuery: jest.Mock;
    };
    useOrgSetupDraftQuery.mockReturnValueOnce({ data: undefined, isFetched: false });
    const { rerender } = render(<OrgSetupPage />);
    expect(capturedWorkspaceProps).toBeNull();

    rerender(<OrgSetupPage />);
    await waitFor(() => {
      expect(capturedWorkspaceProps?.isFirstStep).toBe(true);
    });
    expect(capturedWorkspaceProps?.restoreSlot).toBeTruthy();
  });
});

describe("OrgSetupPage — auto sign-out suppression", () => {
  it("suppresses auto sign-out for the page lifetime and restores it on unmount", async () => {
    const { unmount } = render(<OrgSetupPage />);
    await waitFor(() => {
      expect(mockSetAutoSignOutSuppressed).toHaveBeenCalledWith(true);
    });

    unmount();

    expect(mockSetAutoSignOutSuppressed).toHaveBeenCalledWith(false);
  });
});

describe("OrgSetupPage — pending invitation banner", () => {
  const { useMyPendingInvitations, useClaimInvitation } = jest.requireMock(
    "@/hooks/common/auth-hooks",
  ) as {
    useMyPendingInvitations: jest.Mock;
    useClaimInvitation: jest.Mock;
  };

  const { useOrgSetupDraftQuery, useOrgSetupSessionQuery } = jest.requireMock(
    "@/hooks/api/org-setup",
  ) as {
    useOrgSetupDraftQuery: jest.Mock;
    useOrgSetupSessionQuery: jest.Mock;
  };

  function withInvitations(mutate = jest.fn()) {
    useMyPendingInvitations.mockReturnValue({
      data: [{ id: "inv-1", organizationName: "Acme Corp", role: "Member" }],
      isPending: false,
    });
    useClaimInvitation.mockReturnValue({ mutate, isPending: false });
    useOrgSetupDraftQuery.mockReturnValue({ data: undefined, isFetched: true });
    useOrgSetupSessionQuery.mockReturnValue({ data: undefined, isFetched: true });
  }

  beforeEach(() => {
    useMyPendingInvitations.mockReturnValue({ data: [], isPending: false });
    useOrgSetupDraftQuery.mockReturnValue({ data: undefined, isFetched: true });
    useOrgSetupSessionQuery.mockReturnValue({ data: undefined, isFetched: true });
  });

  it("renders the invite banner when pending invitations are present", async () => {
    withInvitations();
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /pending invitation/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create my own organization/i })).toBeInTheDocument();
  });

  it("calls claimMutation.mutate with the invitation id when Join is clicked", async () => {
    const mutate = jest.fn();
    withInvitations(mutate);
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Join" }));

    expect(mutate).toHaveBeenCalledWith(
      "inv-1",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("disables the Join button while a claim is in flight", async () => {
    const mutate = jest.fn();
    withInvitations(mutate);
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Join" }));

    expect(screen.getByRole("button", { name: "Joining…" })).toBeDisabled();
  });

  it("shows an error toast and re-enables the button when the claim fails", async () => {
    let capturedOnError: ((error: unknown) => void) | undefined;
    const mutate = jest.fn((_id: string, opts: { onError: (e: unknown) => void }) => {
      capturedOnError = opts.onError;
    });
    withInvitations(mutate);
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Join" }));
    act(() => { capturedOnError?.(new Error("Forbidden")); });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
    expect(screen.getByRole("button", { name: "Join" })).toBeEnabled();
  });
});

describe("OrgSetupPage — session name seeds fullName once", () => {
  it("seeds fullName from session name when draft fullName is empty", async () => {
    const { loadDraft } = jest.requireMock("@/features/org-setup/lib/draft") as {
      loadDraft: jest.Mock;
    };
    loadDraft.mockReturnValue({ ...DEFAULT_DATA, fullName: "" });
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Ada Lovelace" }, orgId: null },
    });

    await renderWizard();

    await waitFor(() => {
      expect(capturedShellData?.fullName).toBe("Ada Lovelace");
    });
  });

  it("does not overwrite an existing user/draft fullName", async () => {
    const { loadDraft } = jest.requireMock("@/features/org-setup/lib/draft") as {
      loadDraft: jest.Mock;
    };
    loadDraft.mockReturnValue({ ...DEFAULT_DATA, fullName: "Draft Owner" });
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Ada Lovelace" }, orgId: null },
    });

    await renderWizard();

    await waitFor(() => {
      expect(capturedShellData?.fullName).toBe("Draft Owner");
    });
  });

  it("leaves fullName empty when session has no name so BE can derive", async () => {
    const { loadDraft } = jest.requireMock("@/features/org-setup/lib/draft") as {
      loadDraft: jest.Mock;
    };
    loadDraft.mockReturnValue({ ...DEFAULT_DATA, fullName: "" });
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "" }, orgId: null },
    });

    await renderWizard();

    await waitFor(() => {
      expect(capturedShellData?.fullName).toBe("");
    });
  });
});
