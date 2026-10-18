import { render, screen } from "@testing-library/react";
import { RolesListPanel } from "./roles-list-panel";

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

function renderPanel(search: string) {
  render(
    <RolesListPanel
      isLoading={false}
      rolesError={false}
      rolesQueryError={null}
      roles={[]}
      search={search}
      page={1}
      pagination={{ limit: 20, hasMore: false, nextCursor: null }}
      selectedRoleId={null}
      onRetry={jest.fn()}
      onSelect={jest.fn()}
      onDelete={jest.fn()}
      onRename={jest.fn()}
      onPrevious={jest.fn()}
      onNext={jest.fn()}
      onPageSizeChange={jest.fn()}
    />,
  );
}

describe("RolesListPanel empty state", () => {
  it("explains the fixed org roles instead of inviting role creation", () => {
    renderPanel("");
    expect(screen.queryByText(/create a role/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Org roles are Owner, Admin and Member. Narrow access with module access presets and per-person module availability.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the filter message when a search finds nothing", () => {
    renderPanel("zzz");
    expect(screen.getAllByText("No results match your filters.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Org roles are Owner/)).not.toBeInTheDocument();
  });
});
