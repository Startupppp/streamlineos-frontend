import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@animateicons/react/lucide", () => ({ PlusIcon: () => null, UserXIcon: () => null }));

jest.mock("@/components/illustrations", () => ({ EmptyPersonIllustration: () => null }));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="actions">{actions}</div>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({ Skeleton: () => null }));
jest.mock("@/components/ui/empty-state", () => ({ EmptyState: () => <div>No resignations on record</div> }));
jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: () => null,
  useCursorPager: () => ({ cursor: undefined, goNext: jest.fn(), goPrev: jest.fn(), canGoPrev: false }),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/features/hr/exit/resignation-card", () => ({ ResignationCard: () => null }));
jest.mock("@/features/hr/exit/resignation-form-sheet", () => ({ ResignationFormSheet: () => null }));
jest.mock("@/features/hr/exit/admin-resignation-form-sheet", () => ({ AdminResignationFormSheet: () => null }));
jest.mock("@/features/hr/exit/resignation-review-sheets", () => ({ ResignationReviewSheets: () => null }));
jest.mock("@/features/hr/exit/exit-path-strip", () => ({ ExitPathStrip: () => null }));
jest.mock("@/features/hr/exit/offboarding-checklist-summary-panel", () => ({
  OffboardingChecklistSummaryPanel: () => null,
}));
jest.mock("@/features/hr/exit/use-resignation-review", () => ({ useResignationReview: () => ({}) }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "usr-1" } } }),
}));

let granted = new Set<string>();
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => granted.has(permission),
  useModuleEnabled: () => true,
}));

const mockUseResignations = jest.fn();
jest.mock("@/hooks/api/hr", () => ({
  useResignations: (...args: unknown[]) => mockUseResignations(...args),
}));

import { ExitManagementPage } from "@/features/hr/exit/exit-management-page";

type Row = { id: number; userId: string; status: string };

function withResignations(rows: Row[]) {
  mockUseResignations.mockReturnValue({
    data: { data: rows, pagination: { total: rows.length, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  granted = new Set<string>();
  mockUseResignations.mockReset();
});

describe("ExitManagementPage exit actions", () => {
  it("offers Record resignation to an HR admin who also holds hr:exit:create, the permission pair an owner actually has", () => {
    granted = new Set(["hr:exit:view", "hr:exit:manage", "hr:exit:create", "hr:exit:approve"]);
    withResignations([]);
    render(<ExitManagementPage />);

    expect(screen.getByRole("button", { name: "Record resignation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Initiate termination" })).toBeInTheDocument();
  });

  it("keeps the admin's own resignation action reachable beside the employee one, under a label that cannot be mistaken for it", () => {
    granted = new Set(["hr:exit:view", "hr:exit:manage", "hr:exit:create", "self:resignation"]);
    withResignations([]);
    render(<ExitManagementPage />);

    expect(screen.getByRole("button", { name: "Submit my resignation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record resignation" })).toBeInTheDocument();
  });

  it("withholds Record resignation from someone who cannot manage exits, so no control leads to a denial", () => {
    granted = new Set(["hr:exit:view", "self:resignation"]);
    withResignations([]);
    render(<ExitManagementPage />);

    expect(screen.getByRole("button", { name: "Submit resignation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record resignation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Initiate termination" })).not.toBeInTheDocument();
  });

  it("keeps the admin exit actions available while the admin's own resignation is pending", () => {
    granted = new Set(["hr:exit:view", "hr:exit:manage", "hr:exit:create", "self:resignation"]);
    withResignations([{ id: 1, userId: "usr-1", status: "SUBMITTED" }]);
    render(<ExitManagementPage />);

    expect(screen.getByText("Resignation pending")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record resignation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit my resignation" })).not.toBeInTheDocument();
  });

  it("renders no exit action at all for a viewer who can only read the page", () => {
    granted = new Set(["hr:exit:view"]);
    withResignations([]);
    render(<ExitManagementPage />);

    expect(screen.queryByRole("button", { name: /resignation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Initiate termination" })).not.toBeInTheDocument();
  });
});
