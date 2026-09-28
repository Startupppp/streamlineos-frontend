import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/1/issues",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/components/ui/select", () => {
  const Reactm = require("react");
  const Ctx = Reactm.createContext<{ onValueChange?: (v: string) => void }>({});

  function Select({
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children?: Reactm.ReactNode;
  }) {
    return <Ctx.Provider value={{ onValueChange }}>{children}</Ctx.Provider>;
  }

  function SelectTrigger({
    children,
    "aria-label": ariaLabel,
    className,
  }: {
    children?: Reactm.ReactNode;
    "aria-label"?: string;
    className?: string;
  }) {
    return (
      <button type="button" role="combobox" aria-label={ariaLabel} className={className}>
        {children}
      </button>
    );
  }

  function SelectValue({ placeholder }: { placeholder?: string }) {
    return <span>{placeholder}</span>;
  }

  function SelectContent({ children }: { children?: Reactm.ReactNode }) {
    return <>{children}</>;
  }

  function SelectItem({
    value,
    children,
    className,
  }: {
    value: string;
    children?: Reactm.ReactNode;
    className?: string;
  }) {
    const { onValueChange } = Reactm.useContext(Ctx);
    return (
      <button
        type="button"
        role="option"
        className={className}
        onClick={() => onValueChange?.(value)}
      >
        {children}
      </button>
    );
  }

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: {}, modules: {} },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/features/build/views/view-switcher", () => ({
  ViewSwitcher: () => null,
  parseViewType: (v: string) => v,
}));

jest.mock("@/features/build/views/display-options-panel", () => ({
  DisplayOptionsPanel: () => null,
}));

jest.mock("@/features/build/views/saved-views-menu", () => ({
  SavedViewsMenu: () => null,
}));

jest.mock("@/features/build/views/workload-filter-bar", () => ({
  WorkloadFilterBar: () => null,
}));

jest.mock("@/features/build/views/bug-qa-filters", () => ({
  BugQaFilters: () => null,
}));

jest.mock("@/features/build/shared/ticket-filter-bar", () => ({
  TicketFilterBar: ({ leading }: { leading?: React.ReactNode }) => <>{leading}</>,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: () => null,
}));

jest.mock("@animateicons/react/lucide", () => ({
  BookmarkIcon: React.forwardRef(function BookmarkIcon() {
    return null;
  }),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

import { ProjectViewsToolbar } from "./project-views-toolbar";
import type { DisplayOptions } from "@/features/build/shared/types";

const DISPLAY_OPTIONS: DisplayOptions = {
  columnBy: "status",
  rowBy: "none",
  groupBy: "status",
  orderBy: "manual",
  orderCompleteByRecency: false,
  completedIssues: "all",
  showSubIssues: false,
  showEmptyGroups: false,
  showEmptyColumns: false,
  showEmptyRows: false,
  showId: false,
  showStatus: true,
  showAssignee: true,
  showPriority: true,
  showEstimate: false,
  showCycle: false,
  showLabels: false,
  showDescription: false,
  showDueDate: false,
  showProject: false,
  showMilestone: false,
  showLinks: false,
  showTimeInStatus: false,
  showCreated: false,
  showUpdated: false,
  showPRs: false,
};

const WORKLOAD_FILTERS = {
  statCard: "all" as const,
  cycleId: "all" as const,
  priority: "all" as const,
  type: "all" as const,
  status: "all" as const,
  assigneeId: "all" as const,
  teamId: "all" as const,
  showUnassigned: true,
};

const noop = () => undefined;

function buildBaseToolbarProps() {
  return {
    view: "list" as const,
    onViewChange: noop,
    displayOptions: DISPLAY_OPTIONS,
    onDisplayOptionsChange: noop,
    projectId: 1,
    members: [],
    hideCompleted: false,
    onHideCompletedChange: noop,
    doneCount: 0,
    workloadFilters: WORKLOAD_FILTERS,
    onWorkloadFilterChange: noop,
    onClearWorkloadFilters: noop,
    filterType: "TASK",
    filterSeverity: "",
    filterQaState: "",
    onQaFilterChange: noop,
    onOpenSaveView: noop,
  };
}

describe("ProjectViewsToolbar — module filter", () => {
  it("renders the module select when modules are provided", () => {
    const modules = [
      { id: 1, name: "Auth" },
      { id: 2, name: "Payments" },
    ];

    render(
      <ProjectViewsToolbar
        {...buildBaseToolbarProps()}
        modules={modules}
        onModuleFilterChange={noop}
      />,
    );

    expect(screen.getByRole("combobox", { name: /filter by module/i })).toBeInTheDocument();
  });

  it("does not render the module select when modules is empty", () => {
    render(
      <ProjectViewsToolbar
        {...buildBaseToolbarProps()}
        modules={[]}
        onModuleFilterChange={noop}
      />,
    );

    expect(screen.queryByRole("combobox", { name: /filter by module/i })).not.toBeInTheDocument();
  });

  it("selecting a module calls onModuleFilterChange with the module id, which writes the URL param", async () => {
    const onModuleFilterChange = jest.fn();
    const modules = [
      { id: 42, name: "Billing" },
      { id: 99, name: "Reporting" },
    ];

    render(
      <ProjectViewsToolbar
        {...buildBaseToolbarProps()}
        modules={modules}
        filterModule=""
        onModuleFilterChange={onModuleFilterChange}
      />,
    );

    await userEvent.click(screen.getByRole("combobox", { name: /filter by module/i }));
    await userEvent.click(screen.getByRole("option", { name: "Billing" }));

    expect(onModuleFilterChange).toHaveBeenCalledWith("42");
  });

  it("selecting All modules calls onModuleFilterChange with an empty string, clearing the filter", async () => {
    const onModuleFilterChange = jest.fn();
    const modules = [{ id: 7, name: "Sprint 1" }];

    render(
      <ProjectViewsToolbar
        {...buildBaseToolbarProps()}
        modules={modules}
        filterModule="7"
        onModuleFilterChange={onModuleFilterChange}
      />,
    );

    await userEvent.click(screen.getByRole("combobox", { name: /filter by module/i }));
    await userEvent.click(screen.getByRole("option", { name: /all modules/i }));

    expect(onModuleFilterChange).toHaveBeenCalledWith("");
  });
});
