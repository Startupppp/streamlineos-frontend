import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ResignationDetail } from "@/hooks/api/hr/exit";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@animateicons/react/lucide", () => ({ CheckCheckIcon: () => null }));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, subtitle, actions, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-testid="actions">{actions}</div>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/confirm-with-reason-sheet", () => ({
  ConfirmWithReasonSheet: ({ open, description }: { open: boolean; description?: string }) =>
    open ? <div role="dialog">{description}</div> : null,
}));

jest.mock("@/features/hr/exit/exit-checklist-item-dialog", () => ({
  ExitChecklistItemDialog: ({ item }: { item: { title: string } | null }) => (item ? <div role="dialog">{item.title}</div> : null),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, children, onRetry }: { resolution: { kind: string }; loading: ReactNode; children: ReactNode; onRetry?: () => void }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "denied") return <div role="status">Access Restricted</div>;
    if (resolution.kind === "error")
      return (
        <div role="alert">
          Couldn&apos;t load <button type="button" onClick={onRetry}>Retry</button>
        </div>
      );
    return <>{children}</>;
  },
}));

const mockUseCan = jest.fn<boolean, [string]>(() => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
  useModuleEnabled: () => true,
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
}));

const mockUseResignation = jest.fn();
const mockUseCompleteExit = jest.fn();
const mockUseUpdateExitChecklistItem = jest.fn();
jest.mock("@/hooks/api/hr/exit", () => ({
  useResignation: (...args: [number]) => mockUseResignation(...args),
  useCompleteExit: () => mockUseCompleteExit(),
  useUpdateExitChecklistItem: () => mockUseUpdateExitChecklistItem(),
}));

import { ExitDetailPage } from "./exit-detail-page";

function item(overrides: Partial<ResignationDetail["checklist"]["items"][number]> = {}): ResignationDetail["checklist"]["items"][number] {
  return {
    id: 1,
    itemKey: "asset_return",
    kind: "asset_return",
    title: "Company assets returned and recorded",
    status: "PENDING",
    dueDate: "2026-10-31",
    owner: { type: "queue", permission: "hr:assets:manage", label: "Assets queue" },
    completedAt: null,
    completedBy: null,
    evidence: null,
    notes: null,
    updatedAt: "2026-09-21T00:00:00.000Z",
    viewerCanUpdate: false,
    ...overrides,
  };
}

function detail(overrides: Partial<ResignationDetail> = {}): ResignationDetail {
  return {
    id: 9,
    orgId: "org-1",
    userId: "leaver",
    reason: null,
    reasonCategory: "career",
    lastWorkingDate: "2026-10-31",
    noticePeriodDays: 30,
    status: "FINAL_APPROVED",
    approvedBy: null,
    approvedAt: null,
    hrReviewedBy: null,
    hrReviewedAt: null,
    hrRemarks: null,
    finalReviewedBy: null,
    finalReviewedAt: null,
    finalRemarks: null,
    willingForExitInterview: true,
    companyFeedback: null,
    exitInterviewNotes: null,
    exitInterviewDate: null,
    exitInterviewConductedBy: null,
    feedback: null,
    userMembershipId: 70,
    rowVersion: 1,
    createdAt: "2026-09-18T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
    hasResignationLetter: false,
    user: { id: "leaver", name: "Lee Aver", email: "lee@x.test", image: null, designation: "Engineer", joiningDate: "2024-01-01" },
    hrReviewer: null,
    finalReviewer: null,
    progress: [
      { label: "Submitted", status: "completed", actor: null, timestamp: "2026-09-18T00:00:00.000Z", remarks: null },
      { label: "HR Review", status: "completed", actor: "HR Admin", timestamp: "2026-09-19T00:00:00.000Z", remarks: null },
    ],
    checklist: {
      items: [
        item({ id: 1, itemKey: "manager_handover", kind: "manager_handover", title: "Manager handover", owner: { type: "member", membershipId: 44, userId: "manager", name: "Mia Manager", email: "mia@x.test" }, viewerCanUpdate: true }),
        item({ id: 2, dueDate: "2000-01-01" }),
        item({ id: 3, itemKey: "final_settlement", kind: "final_settlement", title: "Final settlement computed, approved and paid", status: "DONE", evidence: "Paid on 2 Nov", completedAt: "2026-11-02T00:00:00.000Z", completedBy: { membershipId: 1, name: "HR Admin" } }),
      ],
      summary: { total: 3, open: 2, done: 1, waived: 0, overdue: 1 },
    },
    ...overrides,
  };
}

function ready(exit: ResignationDetail) {
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseResignation.mockReturnValue({ data: exit, isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseCompleteExit.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateExitChecklistItem.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseResignation.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: undefined, refetch: jest.fn() });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("ExitDetailPage — one offboarding checklist as the primary content", () => {
  it("keeps the page title and a typed skeleton while loading, and never flashes a denial", () => {
    render(<ExitDetailPage resignationId={9} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Exit");
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows the explicit no-permission state when the snapshot denies hr:exit:view", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "hr:exit:view" });
    render(<ExitDetailPage resignationId={9} />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("shows an error state with retry when the read fails, not an empty checklist", () => {
    const refetch = jest.fn();
    mockUsePageState.mockReturnValue({ kind: "error", error: new Error("boom") });
    mockUseResignation.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("boom"), refetch });
    render(<ExitDetailPage resignationId={9} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.queryByText("No checklist yet")).not.toBeInTheDocument();
  });

  it("renders every item with its owner, due date, status and evidence, and links to the related surfaces the viewer may open", () => {
    mockUseCan.mockImplementation((permission) => permission === "hr:assets:view");
    ready(detail());
    render(<ExitDetailPage resignationId={9} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lee Aver");
    expect(screen.getByText("Mia Manager")).toBeInTheDocument();
    expect(screen.getAllByText("Assets queue").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Overdue")).toHaveLength(2);
    expect(screen.getByText("Paid on 2 Nov")).toBeInTheDocument();
    expect(screen.getByText(/Closed .* by HR Admin/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open asset returns/ })).toHaveAttribute("href", "/hr/asset-returns");
    expect(screen.queryByRole("link", { name: /Open final settlement/ })).not.toBeInTheDocument();
  });

  it("offers exactly one action per item the viewer owns, and none on items they do not", () => {
    ready(detail());
    render(<ExitDetailPage resignationId={9} />);

    expect(screen.getAllByRole("button", { name: "Close item" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Update" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close item" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Manager handover");
  });

  it("shows the Complete exit action only to an exit administrator on an approved exit, and names the open items in the confirmation", () => {
    ready(detail());
    const { unmount } = render(<ExitDetailPage resignationId={9} />);
    expect(screen.queryByRole("button", { name: /Complete exit/ })).not.toBeInTheDocument();
    unmount();

    mockUseCan.mockImplementation((permission) => permission === "hr:exit:manage");
    render(<ExitDetailPage resignationId={9} />);
    fireEvent.click(screen.getByRole("button", { name: /Complete exit/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("2 checklist items are still open");
  });

  it("freezes the checklist once the exit is complete", () => {
    mockUseCan.mockReturnValue(true);
    ready(detail({ status: "COMPLETED" }));
    render(<ExitDetailPage resignationId={9} />);

    expect(screen.queryByRole("button", { name: "Close item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Complete exit/ })).not.toBeInTheDocument();
  });

  it("explains that the checklist appears at final approval when there are no items yet", () => {
    ready(detail({ status: "PENDING_HR", checklist: { items: [], summary: { total: 0, open: 0, done: 0, waived: 0, overdue: 0 } } }));
    render(<ExitDetailPage resignationId={9} />);

    expect(screen.getByText("No checklist yet")).toBeInTheDocument();
  });
});
