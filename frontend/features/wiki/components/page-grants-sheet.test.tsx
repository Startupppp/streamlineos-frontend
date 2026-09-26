import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PageGrantsSheet from "./page-grants-sheet";
import type { KbPageGrant } from "@/hooks/api/kb/page-grants";
import type { OrgMember } from "@/hooks/api/organization";

jest.mock("@/hooks/api/kb/page-grants", () => ({
  useKbPageGrants: jest.fn(),
  useCreateKbPageGrant: jest.fn(),
  useRevokeKbPageGrant: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: jest.fn(
    ({
      resolution,
      loading,
      empty,
      children,
    }: {
      resolution: { kind: string };
      loading: React.ReactNode;
      empty?: React.ReactNode;
      children: React.ReactNode;
    }) => {
      if (resolution.kind === "loading") return <>{loading}</>;
      if (resolution.kind === "denied") return <div data-testid="denied-state">No permission</div>;
      if (resolution.kind === "empty") return <div data-testid="empty-state">{empty ?? children}</div>;
      return <>{children}</>;
    },
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    description,
    destructive,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    description: string;
    destructive?: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="confirm-dialog" data-destructive={String(Boolean(destructive))}>
        <span data-testid="confirm-title">{title}</span>
        <span data-testid="confirm-description">{description}</span>
        <button type="button" data-testid="confirm-btn" onClick={onConfirm}>
          Confirm
        </button>
        <button type="button" data-testid="cancel-btn" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
      </div>
    ) : null,
}));

jest.mock("@/components/ui/command", () => ({
  Command: ({ children, shouldFilter: _sf, ...props }: React.PropsWithChildren<{ shouldFilter?: boolean; className?: string }>) => (
    <div {...props}>{children}</div>
  ),
  CommandInput: ({
    onValueChange,
    onFocus,
    onBlur,
    value,
    placeholder,
  }: {
    onValueChange?: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    value?: string;
    placeholder?: string;
  }) => (
    <input
      data-testid="member-search-input"
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  ),
  CommandList: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="member-list" className={className}>{children}</div>
  ),
  CommandEmpty: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="member-empty" className={className}>{children}</div>
  ),
  CommandItem: ({
    children,
    onSelect,
    value,
    onMouseDown,
    className,
  }: React.PropsWithChildren<{
    onSelect?: (value: string) => void;
    onMouseDown?: (e: React.MouseEvent) => void;
    value?: string;
    className?: string;
  }>) => (
    <button
      type="button"
      data-testid={`member-option-${value ?? ""}`}
      className={className}
      onMouseDown={onMouseDown}
      onClick={() => onSelect?.(value ?? "")}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title, description }: { title: string; description: string; compact?: boolean }) => (
    <div data-testid="empty-state-content">
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbUsersIcon: ({ className }: { className?: string }) => (
    <span data-testid="icon-users" className={className} />
  ),
  KbTrash2Icon: ({ className }: { className?: string }) => (
    <span data-testid="icon-trash" className={className} />
  ),
  KbXIcon: ({ className }: { className?: string }) => (
    <span data-testid="icon-x" className={className} />
  ),
}));

jest.mock("@/features/wiki/lib/kb-date-utils", () => ({
  kbFormatDate: () => "Jan 1, 2026",
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: <T,>(v: T) => v,
}));

const {
  useKbPageGrants,
  useCreateKbPageGrant,
  useRevokeKbPageGrant,
} = jest.requireMock("@/hooks/api/kb/page-grants") as {
  useKbPageGrants: jest.Mock;
  useCreateKbPageGrant: jest.Mock;
  useRevokeKbPageGrant: jest.Mock;
};

const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };
const { useOrgMembers } = jest.requireMock("@/hooks/api/organization") as { useOrgMembers: jest.Mock };
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as { usePageState: jest.Mock };

function makeGrant(overrides: Partial<KbPageGrant> = {}): KbPageGrant {
  return {
    id: 1,
    pageId: 42,
    membershipId: 10,
    role: null,
    access: "view",
    grantedByMembershipId: 1,
    createdAt: "2026-01-01T00:00:00Z",
    revokedAt: null,
    ...overrides,
  };
}

function makeMember(overrides: Partial<OrgMember> = {}): OrgMember {
  return {
    membershipId: 10,
    userId: "user-abc",
    role: "MEMBER",
    joinedAt: "2026-01-01T00:00:00Z",
    name: "Alice Smith",
    email: "alice@example.com",
    image: null,
    totpEnabled: false,
    ...overrides,
  };
}

const defaultMutateFn = jest.fn();

function defaultGrantsPage(grants: KbPageGrant[] = []) {
  return {
    data: { data: grants, pagination: { limit: 100, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
  usePageState.mockReturnValue({ kind: "ready" });
  useKbPageGrants.mockReturnValue(defaultGrantsPage());
  useCreateKbPageGrant.mockReturnValue({ mutate: defaultMutateFn, isPending: false });
  useRevokeKbPageGrant.mockReturnValue({ mutate: defaultMutateFn, isPending: false });
  useOrgMembers.mockReturnValue({ data: { data: [], pagination: { limit: 100, hasMore: false, nextCursor: null } } });
});

function renderSheet(props: { pageId?: number; open?: boolean; onOpenChange?: jest.Mock } = {}) {
  const onOpenChange = props.onOpenChange ?? jest.fn();
  return render(
    <PageGrantsSheet
      pageId={props.pageId ?? 42}
      open={props.open ?? true}
      onOpenChange={onOpenChange}
    />,
  );
}

describe("PageGrantsSheet — creating a grant", () => {
  it("submitting in member mode sends membershipId and no role", () => {
    const createMutate = jest.fn();
    useCreateKbPageGrant.mockReturnValue({ mutate: createMutate, isPending: false });
    const alice = makeMember({ membershipId: 10 });
    useOrgMembers.mockReturnValue({
      data: { data: [alice], pagination: { limit: 20, hasMore: false, nextCursor: null } },
    });

    renderSheet();

    fireEvent.focus(screen.getByTestId("member-search-input"));

    fireEvent.click(screen.getByTestId(`member-option-${alice.userId}`));

    fireEvent.click(screen.getByRole("button", { name: /grant access/i }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    const [callArg] = createMutate.mock.calls[0] as [{ pageId: number; membershipId?: number; role?: string; access: string }];
    expect(callArg.membershipId).toBe(alice.membershipId);
    expect(callArg).not.toHaveProperty("role");
  });

  it("submit button is disabled in role mode until a role is selected", () => {
    const createMutate = jest.fn();
    useCreateKbPageGrant.mockReturnValue({ mutate: createMutate, isPending: false });

    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: /by role/i }));

    const submitBtn = screen.getByRole("button", { name: /grant access/i });
    expect(submitBtn).toBeDisabled();
    fireEvent.click(submitBtn);

    expect(createMutate).not.toHaveBeenCalled();
  });

  it("switching mode clears the previous selection so only one target type is active", () => {
    const createMutate = jest.fn();
    useCreateKbPageGrant.mockReturnValue({ mutate: createMutate, isPending: false });
    const alice = makeMember({ membershipId: 10 });
    useOrgMembers.mockReturnValue({
      data: { data: [alice], pagination: { limit: 20, hasMore: false, nextCursor: null } },
    });

    renderSheet();

    fireEvent.focus(screen.getByTestId("member-search-input"));
    fireEvent.click(screen.getByTestId(`member-option-${alice.userId}`));

    fireEvent.click(screen.getByRole("button", { name: /by role/i }));

    const submitBtn = screen.getByRole("button", { name: /grant access/i });
    expect(submitBtn).toBeDisabled();
  });
});

describe("PageGrantsSheet — revoking a grant", () => {
  it("clicking revoke shows a destructive ConfirmDialog, and confirming calls DELETE with the correct grantId", () => {
    const revokeMutate = jest.fn();
    useRevokeKbPageGrant.mockReturnValue({ mutate: revokeMutate, isPending: false });
    const grant = makeGrant({ id: 7, pageId: 42 });
    useKbPageGrants.mockReturnValue(defaultGrantsPage([grant]));
    useOrgMembers.mockReturnValue({
      data: { data: [makeMember({ membershipId: grant.membershipId ?? 0 })], pagination: { limit: 100, hasMore: false, nextCursor: null } },
    });

    renderSheet({ pageId: 42 });

    const revokeBtn = screen.getByRole("button", { name: /revoke access/i });
    fireEvent.click(revokeBtn);

    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-dialog").dataset.destructive).toBe("true");

    fireEvent.click(screen.getByTestId("confirm-btn"));

    expect(revokeMutate).toHaveBeenCalledTimes(1);
    const [callArg] = revokeMutate.mock.calls[0] as [{ pageId: number; grantId: number }];
    expect(callArg.grantId).toBe(7);
    expect(callArg.pageId).toBe(42);
  });

  it("cancelling the revoke dialog does not call the mutation", () => {
    const revokeMutate = jest.fn();
    useRevokeKbPageGrant.mockReturnValue({ mutate: revokeMutate, isPending: false });
    const grant = makeGrant({ id: 7 });
    useKbPageGrants.mockReturnValue(defaultGrantsPage([grant]));
    useOrgMembers.mockReturnValue({
      data: { data: [makeMember({ membershipId: grant.membershipId ?? 0 })], pagination: { limit: 100, hasMore: false, nextCursor: null } },
    });

    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: /revoke access/i }));
    fireEvent.click(screen.getByTestId("cancel-btn"));

    expect(revokeMutate).not.toHaveBeenCalled();
  });
});

describe("PageGrantsSheet — permission gating", () => {
  it("a user WITH kb:pages:update sees the mode buttons and revoke controls", () => {
    useCan.mockReturnValue(true);
    const grant = makeGrant({ id: 3 });
    useKbPageGrants.mockReturnValue(defaultGrantsPage([grant]));
    useOrgMembers.mockReturnValue({
      data: { data: [makeMember({ membershipId: grant.membershipId ?? 0 })], pagination: { limit: 100, hasMore: false, nextCursor: null } },
    });

    renderSheet();

    expect(screen.getByRole("button", { name: /by member/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /by role/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revoke access/i })).toBeInTheDocument();
  });

  it("a user WITHOUT kb:pages:update sees the grant list but no add or revoke controls", () => {
    useCan.mockImplementation((permission: string) => permission !== "kb:pages:update");
    const grant = makeGrant({ id: 3 });
    useKbPageGrants.mockReturnValue(defaultGrantsPage([grant]));
    useOrgMembers.mockReturnValue({
      data: { data: [makeMember({ membershipId: grant.membershipId ?? 0 })], pagination: { limit: 100, hasMore: false, nextCursor: null } },
    });

    renderSheet();

    expect(screen.queryByRole("button", { name: /by member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /by role/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revoke access/i })).not.toBeInTheDocument();

    expect(screen.getByTestId("icon-users")).toBeInTheDocument();
  });
});

describe("PageGrantsSheet — denial is not emptiness", () => {
  it("a denied resolution renders the denied state, not the empty state", () => {
    usePageState.mockReturnValue({ kind: "denied" });
    useKbPageGrants.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    renderSheet();

    expect(screen.getByTestId("denied-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("an empty resolution renders the empty state, not the denied state", () => {
    usePageState.mockReturnValue({ kind: "empty" });
    useKbPageGrants.mockReturnValue(defaultGrantsPage([]));

    renderSheet();

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("denied-state")).not.toBeInTheDocument();
  });
});
