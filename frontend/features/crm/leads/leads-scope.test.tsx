import { render, screen } from "@testing-library/react";
import { LeadsToolbar } from "./leads-toolbar";
import type { DataScope } from "@/types/access";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/crm/leads",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/crm", () => ({
  useCrmOptions: () => ({ data: [] }),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (value: string) => value,
}));

function renderToolbar(scope: DataScope) {
  return render(
    <LeadsToolbar
      searchQuery=""
      onSearchChange={jest.fn()}
      view="table"
      onViewChange={jest.fn()}
      statusFilter={undefined}
      priorityFilter={undefined}
      sourceFilter={undefined}
      onStatusFilterChange={jest.fn()}
      onPriorityFilterChange={jest.fn()}
      onSourceFilterChange={jest.fn()}
      onClearFilters={jest.fn()}
      scope={scope}
    />,
  );
}

describe("LeadsToolbar — a narrowed list says so", () => {
  it("says nothing at full scope, so an unrestricted list reads as unrestricted", () => {
    renderToolbar("all");
    expect(screen.queryByText("Your leads only")).not.toBeInTheDocument();
    expect(screen.queryByText("Your team's leads")).not.toBeInTheDocument();
  });

  it("tells an own-scoped person the list is only their records", () => {
    renderToolbar("own");
    expect(screen.getByText("Your leads only")).toBeInTheDocument();
    expect(screen.queryByText("Your team's leads")).not.toBeInTheDocument();
  });

  it("tells a team-scoped person the list is their team's records", () => {
    renderToolbar("team");
    expect(screen.getByText("Your team's leads")).toBeInTheDocument();
    expect(screen.queryByText("Your leads only")).not.toBeInTheDocument();
  });

  it("says nothing while access is unresolved, so a label never flashes", () => {
    renderToolbar("none");
    expect(screen.queryByText("Your leads only")).not.toBeInTheDocument();
    expect(screen.queryByText("Your team's leads")).not.toBeInTheDocument();
  });
});
