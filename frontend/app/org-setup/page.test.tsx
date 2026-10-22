import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { DEFAULT_DATA } from "@/features/org-setup/lib/constants";
import type { WizardData } from "@/features/org-setup/lib/wizard-data-schema";

const mockSignIn = jest.fn();
const mockToastError = jest.fn();
const mockLocationReplace = jest.fn();
const mockSetAutoSignOutSuppressed = jest.fn();
const mockSignOut = jest.fn();
const mockUseOrgSetupSessionQuery = jest.fn((_enabled: boolean) => ({
  data: undefined,
}));

let capturedShellData: Partial<WizardData> | null = null;
let capturedShellProps: { syncStatus?: string; onRetrySave?: () => void } = {};
let capturedStepProps: {
  onNext?: () => void;
  patch?: (updates: Record<string, unknown>) => void;
} = {};
let capturedInviteProps: {
  data?: { invitees?: unknown[] };
  onBack?: () => void;
  onChangeInvitees?: (invitees: unknown[]) => void;
} = {};
const mockSaveDraft = jest.fn();

jest.mock("@/features/org-setup/components/org-setup-shell", () => ({
  OrgSetupShell: ({
    children,
    data,
    syncStatus,
    onRetrySave,
  }: PropsWithChildren & {
    data?: Partial<WizardData>;
    syncStatus?: string;
    onRetrySave?: () => void;
  }) => {
    capturedShellData = data ?? null;
    capturedShellProps = { syncStatus, onRetrySave };
    return <div>{children}</div>;
  },
}));

jest.mock("@/features/org-setup/components/step-workspace", () => ({
  StepWorkspace: (props: typeof capturedStepProps) => {
    capturedStepProps = props;
    return <p>workspace step</p>;
  },
}));

jest.mock("@/features/org-setup/components/step-invite-launch", () => ({
  StepInviteLaunch: (props: typeof capturedInviteProps) => {
    capturedInviteProps = props;
    return <p>invite step</p>;
  },
}));

jest.mock("@/components/organization/archived-orgs-restore", () => ({
  ArchivedOrgsRestore: () => null,
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  signInWithMagicToken: jest.fn((...args: unknown[]) => mockSignIn(...args)),
  useMyPendingInvitations: jest.fn(() => ({ data: [] })),
  useClaimInvitation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useSignOut: jest.fn(() => ({ mutate: mockSignOut, isPending: false })),
}));

jest.mock("@/hooks/api/org-setup", () => ({
  useOrgSetupSessionQuery: jest.fn((enabled: boolean) =>
    mockUseOrgSetupSessionQuery(enabled),
  ),
  useOrgSetupDraftQuery: jest.fn(() => ({ data: undefined, isFetched: false })),
  useOrgSetupDraftSaveMutation: jest.fn(() => ({ mutateAsync: mockSaveDraft })),
}));

jest.mock("@/features/org-setup/lib/draft", () => ({
  loadDraft: jest.fn(() => ({ ...DEFAULT_DATA })),
  saveDraft: jest.fn(),
  hasCompletionMarker: jest.fn(() => false),
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
  const { useMyPendingInvitations } = jest.requireMock("@/hooks/common/auth-hooks") as {
    useMyPendingInvitations: jest.Mock;
  };
  useMyPendingInvitations.mockReturnValue({ data: [], isPending: false });
  mockSignIn.mockReset().mockResolvedValue({ status: "signed-in" });
  mockToastError.mockReset();
  mockLocationReplace.mockReset();
  mockSetAutoSignOutSuppressed.mockReset();
  mockUseOrgSetupSessionQuery.mockClear();
  capturedShellData = null;
  capturedShellProps = {};
  capturedStepProps = {};
  capturedInviteProps = {};
  mockSaveDraft.mockReset().mockResolvedValue({ success: true, revision: 1 });
  mockUseSession.mockReset().mockReturnValue({
    data: { user: { id: "user-1", name: "Ada" }, orgId: null },
  });
});

import OrgSetupPage from "@/app/org-setup/page";

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

  it("signs the user out from the pending invitation view (B-022)", async () => {
    mockSignOut.mockClear();
    withInvitations();
    render(<OrgSetupPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("shows the sign-out in progress on the button itself (B-022, FE-80)", async () => {
    const { useSignOut } = jest.requireMock("@/hooks/common/auth-hooks");
    useSignOut.mockReturnValue({ mutate: mockSignOut, isPending: true });
    withInvitations();
    render(<OrgSetupPage />);

    const signingOut = await screen.findByRole("button", { name: /Signing out/ });
    expect(signingOut).toBeDisabled();
    expect(signingOut).toHaveAttribute("aria-busy", "true");
    useSignOut.mockReturnValue({ mutate: mockSignOut, isPending: false });
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

  it("B-022: clicking Join claims the invite, signs in with the returned token and lands on /post-invite", async () => {
    let capturedOnSuccess: ((data: unknown) => Promise<void>) | undefined;
    const mutate = jest.fn((_id: string, opts: { onSuccess: (data: unknown) => Promise<void> }) => {
      capturedOnSuccess = opts.onSuccess;
    });
    withInvitations(mutate);
    render(<OrgSetupPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Join" }));
    expect(mutate).toHaveBeenCalledWith("inv-1", expect.anything());
    await act(async () => {
      await capturedOnSuccess?.({ ok: true, autoLoginToken: "claim-token", skippedGrants: [] });
    });

    expect(mockSignIn).toHaveBeenCalledWith("claim-token");
    expect(window.location.href).toBe("/post-invite");
    expect(mockToastError).not.toHaveBeenCalled();
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

describe("OrgSetupPage — simplified setup with invitations", () => {
  const { useOrgSetupDraftQuery, useOrgSetupSessionQuery } = jest.requireMock(
    "@/hooks/api/org-setup",
  ) as { useOrgSetupDraftQuery: jest.Mock; useOrgSetupSessionQuery: jest.Mock };

  beforeEach(() => {
    useOrgSetupDraftQuery.mockReturnValue({ data: undefined, isFetched: true });
    useOrgSetupSessionQuery.mockReturnValue({ data: undefined, isFetched: true });
  });

  afterEach(() => {
    useOrgSetupDraftQuery.mockReturnValue({ data: undefined, isFetched: false });
    useOrgSetupSessionQuery.mockImplementation((enabled: boolean) =>
      mockUseOrgSetupSessionQuery(enabled),
    );
  });

  it("upgrades an old draft to all modules and keeps its invitations for review", async () => {
    const { loadDraft } = jest.requireMock("@/features/org-setup/lib/draft") as {
      loadDraft: jest.Mock;
    };
    loadDraft.mockReturnValue({
      ...DEFAULT_DATA,
      displayName: "Acme",
      modules: ["kb"],
      invitees: [{ email: "old@example.com", role: "MEMBER" }],
      phone: "+919876543210",
      country: "IN",
      timezone: "Asia/Kolkata",
      industry: "IT Services",
      teamSize: "1-10",
      moduleAnswers: { build: { workType: "Software" } },
    });

    render(<OrgSetupPage />);
    await screen.findByText("workspace step");

    expect(capturedShellData?.modules).toEqual(DEFAULT_DATA.modules);
    expect(capturedShellData).toMatchObject({
      phone: "+919876543210",
      country: "IN",
      timezone: "Asia/Kolkata",
      industry: "IT Services",
      teamSize: "1-10",
    });
    expect(capturedShellData?.invitees).toEqual([
      { email: "old@example.com", role: "MEMBER" },
    ]);

    act(() => capturedStepProps.onNext?.());
    expect(screen.getByText("invite step")).toBeInTheDocument();
    expect(capturedInviteProps.data?.invitees).toEqual([
      { email: "old@example.com", role: "MEMBER" },
    ]);
  });

  it("opens the invitation step without waiting for draft autosave and allows going back", async () => {
    render(<OrgSetupPage />);
    await screen.findByText("workspace step");

    act(() => capturedStepProps.patch?.({ displayName: "Acme" }));
    act(() => capturedStepProps.onNext?.());

    expect(screen.getByText("invite step")).toBeInTheDocument();
    expect(capturedShellData?.modules).toEqual(DEFAULT_DATA.modules);

    act(() => capturedInviteProps.onBack?.());
    expect(screen.getByText("workspace step")).toBeInTheDocument();
  });

  it("keeps invitations edited on the invitation step", async () => {
    render(<OrgSetupPage />);
    await screen.findByText("workspace step");
    act(() => capturedStepProps.onNext?.());
    const invitees = [{ email: "new@example.com", role: "MEMBER" }];
    act(() => capturedInviteProps.onChangeInvitees?.(invitees));

    expect(capturedShellData?.invitees).toEqual(invitees);
  });

  it("offers retry when saving the workspace draft fails", async () => {
    mockSaveDraft.mockRejectedValueOnce(new Error("offline"));
    render(<OrgSetupPage />);
    await screen.findByText("workspace step");

    act(() => {
      capturedStepProps.patch?.({ displayName: "Acme" });
    });
    await waitFor(() => expect(capturedShellProps.syncStatus).toBe("error"));

    act(() => {
      capturedShellProps.onRetrySave?.();
    });
    await waitFor(() => expect(capturedShellProps.syncStatus).toBe("synced"));
    expect(mockSaveDraft).toHaveBeenCalledTimes(2);
  });
});
describe("OrgSetupPage — session name seeds fullName once", () => {
  const { useOrgSetupDraftQuery, useOrgSetupSessionQuery } = jest.requireMock(
    "@/hooks/api/org-setup",
  ) as { useOrgSetupDraftQuery: jest.Mock; useOrgSetupSessionQuery: jest.Mock };

  async function renderWizard() {
    render(<OrgSetupPage />);
    await screen.findByText("workspace step");
  }

  beforeEach(() => {
    useOrgSetupDraftQuery.mockReturnValue({ data: undefined, isFetched: true });
    useOrgSetupSessionQuery.mockReturnValue({ data: undefined, isFetched: true });
  });

  afterEach(() => {
    useOrgSetupDraftQuery.mockReturnValue({ data: undefined, isFetched: false });
    useOrgSetupSessionQuery.mockImplementation((enabled: boolean) =>
      mockUseOrgSetupSessionQuery(enabled),
    );
  });

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
