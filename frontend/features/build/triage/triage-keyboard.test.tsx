import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { TriagePage } from "./triage-page";

jest.mock("@/hooks/api/build/projects", () => ({ useProject: jest.fn() }));
jest.mock("@/hooks/api/build/tickets", () => ({
  useTickets: jest.fn(),
  useUpdateTicket: jest.fn(),
  useBulkUpdateTickets: jest.fn(),
}));
jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/build/1/triage",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: "", debouncedSearch: "", cursor: null,
    setSearch: jest.fn(), setCursor: jest.fn(), clearAll: jest.fn(),
    resetKey: "", value: jest.fn(() => ""), setValue: jest.fn(),
    activeCount: 0, isFiltered: false,
  }),
}));
jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: () => <div data-testid="table-pagination" />,
}));
jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => <div data-testid="build-list-toolbar" />,
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));
jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => <div>{description}</div>,
}));
jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton-item" />,
}));
jest.mock("./triage-row", () => ({
  TriageRow: ({ ticket, onAccept, onDecline }: { ticket: { id: number }; onAccept?: (id: number) => void; onDecline?: (id: number) => void }) => (
    <div data-testid="triage-row">
      <button type="button" onClick={() => onAccept?.(ticket.id)}>Accept</button>
      <button type="button" onClick={() => onDecline?.(ticket.id)}>Decline</button>
    </div>
  ),
}));
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));
jest.mock("@/hooks/api/build/project-members", () => ({
  useProjectMembers: jest.fn(() => ({ data: [] })),
}));
jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: jest.fn(() => ({ data: [] })),
}));
jest.mock("@/hooks/api/build/ticket-cache", () => ({
  removeTicketFromCollections: jest.fn(),
}));
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => ({}),
}));
jest.mock("@/features/build/shared/bulk-action-bar", () => ({
  BulkActionBar: () => <div data-testid="bulk-action-bar" />,
}));
jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: jest.fn(() => "/build/1/tickets/1"),
}));

import { useProject } from "@/hooks/api/build/projects";
import { useTickets, useUpdateTicket, useBulkUpdateTickets } from "@/hooks/api/build/tickets";
import { useAccess, useCan } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";

const mockUseProject = useProject as jest.Mock;
const mockUseTickets = useTickets as jest.Mock;
const mockUseUpdateTicket = useUpdateTicket as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;
const mockUseBulkUpdateTickets = useBulkUpdateTickets as jest.Mock;

const SUBMISSION = {
  id: 99, orgId: "org-1", projectId: 1, title: "Bug: button broken",
  type: "BUG", status: "TRIAGE", priority: "HIGH", ticketNumber: 99,
  epicId: null, reporterId: "user-1", points: null, storyPoints: null,
  link: null, rank: "1000", parentTicketId: null, originalEstimate: null,
  timeSpent: null, startDate: null, dueDate: null, moduleId: null, cycleId: null,
  sequenceId: "PROJ-99", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
};

function baseTicketsResult(overrides = {}) {
  return {
    data: undefined, isLoading: false, isError: false,
    error: undefined, refetch: jest.fn(), ...overrides,
  };
}

beforeEach(() => {
  jest.mocked(useCan).mockReturnValue(true);
  mockUseAccess.mockReturnValue({
    data: { isOrgOwner: false, scopes: { "build:tickets:view": "all" }, modules: {} },
    isLoading: false,
  });
  mockUseProject.mockReturnValue({ data: { key: "PROJ" } });
  mockUseTickets.mockReturnValue(
    baseTicketsResult({ data: { data: [SUBMISSION], pagination: { hasMore: false } } }),
  );
  mockUseUpdateTicket.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockUseBulkUpdateTickets.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("BT-6bce4f4e5ecd — keyboard shortcuts: pressing a/d dispatches accept/decline for the focused row", () => {
  it.each([
    { key: "a", status: "IN_PROGRESS", label: "ACCEPT" },
    { key: "d", status: "CANCELLED", label: "DECLINE" },
  ])("pressing '$key' when a row is focused calls updateTicket with $label status", async ({ key, status }) => {
    const mutateFn = jest.fn();
    mockUseUpdateTicket.mockReturnValue({ mutate: mutateFn, isPending: false });
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: 0, setFocusedIndex: jest.fn() });
    render(<TriagePage projectId={1} />);
    await act(async () => {
      fireEvent.keyDown(document, { key });
      await Promise.resolve();
    });
    expect(mutateFn).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: SUBMISSION.id, status }),
      expect.any(Object),
    );
  });

  it("pressing 'a' when no row is focused does not call updateTicket", async () => {
    const mutateFn = jest.fn();
    mockUseUpdateTicket.mockReturnValue({ mutate: mutateFn, isPending: false });
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
    render(<TriagePage projectId={1} />);
    await act(async () => {
      fireEvent.keyDown(document, { key: "a" });
      await Promise.resolve();
    });
    expect(mutateFn).not.toHaveBeenCalled();
  });
});


describe("Triage keyboard mutation guards", () => {
  function renderFocused(overrides = {}) {
    const mutate = jest.fn();
    mockUseUpdateTicket.mockReturnValue({ mutate, isPending: false, ...overrides });
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: 0, setFocusedIndex: jest.fn() });
    render(<TriagePage projectId={1} />);
    return mutate;
  }

  it.each(["ctrlKey", "metaKey", "altKey"])("ignores %s shortcuts for both decisions", modifier => {
    const mutate = renderFocused();
    fireEvent.keyDown(document, { key: "a", [modifier]: true });
    fireEvent.keyDown(document, { key: "d", [modifier]: true });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("ignores held-key repeat for both decisions", () => {
    const mutate = renderFocused();
    fireEvent.keyDown(document, { key: "a", repeat: true });
    fireEvent.keyDown(document, { key: "d", repeat: true });
    expect(mutate).not.toHaveBeenCalled();
  });

  it.each(["input", "textarea", "select"])("ignores keys inside a %s", tag => {
    const mutate = renderFocused();
    const target = document.createElement(tag);
    document.body.appendChild(target);
    try {
      fireEvent.keyDown(target, { key: "a" });
      fireEvent.keyDown(target, { key: "d" });
      expect(mutate).not.toHaveBeenCalled();
    } finally {
      target.remove();
    }
  });

  it.each(["true", "", "plaintext-only"])("ignores a child of contenteditable=%s", editable => {
    const mutate = renderFocused();
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", editable);
    const child = document.createElement("span");
    editor.appendChild(child);
    document.body.appendChild(editor);
    try {
      fireEvent.keyDown(child, { key: "a" });
      fireEvent.keyDown(child, { key: "d" });
      expect(mutate).not.toHaveBeenCalled();
    } finally {
      editor.remove();
    }
  });

  it("ignores decisions while the canonical mutation is pending", () => {
    const mutate = renderFocused({ isPending: true });
    fireEvent.keyDown(document, { key: "a" });
    fireEvent.keyDown(document, { key: "d" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("ignores both decisions without update permission", () => {
    jest.mocked(useCan).mockReturnValue(false);
    const mutate = renderFocused();
    fireEvent.keyDown(document, { key: "a" });
    fireEvent.keyDown(document, { key: "d" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it.each([["a", "a"], ["d", "d"], ["a", "d"], ["d", "a"]])(
    "blocks synchronous %s then %s duplicate or opposing decisions", (first, second) => {
      const mutate = renderFocused();
      act(() => {
        fireEvent.keyDown(document, { key: first });
        fireEvent.keyDown(document, { key: second });
      });
      expect(mutate).toHaveBeenCalledTimes(1);
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ ticketId: SUBMISSION.id, status: first === "a" ? "IN_PROGRESS" : "CANCELLED" }),
        expect.any(Object),
      );
      fireEvent.keyDown(document, { key: second });
      expect(mutate).toHaveBeenCalledTimes(1);
    },
  );

  it("allows a fresh keyboard decision after a rejected decision settles", () => {
    const mutate = renderFocused();
    fireEvent.keyDown(document, { key: "a" });
    expect(mutate).toHaveBeenCalledTimes(1);
    act(() => {
      const callbacks = mutate.mock.calls[0][1];
      callbacks.onError(new Error("Retry the decision"));
    });
    fireEvent.keyDown(document, { key: "d" });
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(mutate).toHaveBeenLastCalledWith(
      expect.objectContaining({ ticketId: SUBMISSION.id, status: "CANCELLED" }), expect.any(Object),
    );
  });
});
