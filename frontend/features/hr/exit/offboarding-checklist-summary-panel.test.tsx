import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import type { OffboardingChecklistRow } from "@/hooks/api/hr/exit";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

let canManage = true;
jest.mock("@/hooks/api/access", () => ({
  useCan: () => canManage,
  useModuleEnabled: () => true,
}));

const mockUseOffboardingChecklists = jest.fn();
jest.mock("@/hooks/api/hr/exit", () => ({
  useOffboardingChecklists: () => mockUseOffboardingChecklists(),
}));

import { OffboardingChecklistSummaryPanel } from "@/features/hr/exit/offboarding-checklist-summary-panel";

function row(overrides: Partial<OffboardingChecklistRow> = {}): OffboardingChecklistRow {
  return {
    anchorKind: "termination",
    anchorId: 2,
    employeeDisplayName: "QA HR Thirteen",
    relevantDate: "2026-10-14",
    openItems: 3,
    totalItems: 5,
    ...overrides,
  };
}

function withRows(rows: OffboardingChecklistRow[]) {
  mockUseOffboardingChecklists.mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  canManage = true;
  mockUseOffboardingChecklists.mockReset();
});

describe("OffboardingChecklistSummaryPanel", () => {
  it("shows a checklist anchored to a completed termination, which was seeded but unreadable before", () => {
    withRows([row()]);
    render(<OffboardingChecklistSummaryPanel />);

    expect(screen.getByText("QA HR Thirteen")).toBeInTheDocument();
    expect(screen.getByText(/Termination/)).toBeInTheDocument();
    expect(screen.getByText("3 open")).toBeInTheDocument();
    expect(screen.getByText("2/5")).toBeInTheDocument();
  });

  it("shows a resignation-anchored checklist too, so the one list covers both exit paths", () => {
    withRows([row({ anchorKind: "resignation", anchorId: 7, employeeDisplayName: "Jane Doe" })]);
    render(<OffboardingChecklistSummaryPanel />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open/ })).toHaveAttribute("href", "/hr/exit/7");
  });

  it("marks a checklist with nothing outstanding as complete rather than showing zero open", () => {
    withRows([row({ openItems: 0, totalItems: 4 })]);
    render(<OffboardingChecklistSummaryPanel />);

    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.queryByText("0 open")).not.toBeInTheDocument();
  });

  it("withholds the termination link from someone who cannot manage exits, since that route requires hr:exit:manage", () => {
    canManage = false;
    withRows([row()]);
    render(<OffboardingChecklistSummaryPanel />);

    expect(screen.getByText("QA HR Thirteen")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open/ })).not.toBeInTheDocument();
  });

  it("renders nothing when the organisation has no offboarding checklists, so the panel adds no noise", () => {
    withRows([]);
    const { container } = render(<OffboardingChecklistSummaryPanel />);

    expect(container).toBeEmptyDOMElement();
  });

  it("degrades inline with a retry when the read fails, instead of blanking the exit route", () => {
    const refetch = jest.fn();
    mockUseOffboardingChecklists.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    render(<OffboardingChecklistSummaryPanel />);

    expect(screen.getByText(/Couldn't load offboarding checklists/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
