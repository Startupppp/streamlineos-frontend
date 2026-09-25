import { fireEvent, render, screen } from "@testing-library/react";
import { SavedViewsMenu } from "./saved-views-menu";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams("status=TODO"),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useCanState: () => "allowed",
}));

jest.mock("@/hooks/api/build", () => ({
  useViews: () => ({
    data: [
      {
        id: 9,
        name: "Todo list",
        layoutType: "list",
        isPinned: false,
        filters: { status: "TODO" },
      },
    ],
    isLoading: false,
  }),
  useUpdateView: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteView: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/components/ui/responsive-popover", () => ({
  ResponsivePopover: ({ children }: { children: React.ReactNode }) => children,
  ResponsivePopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
  ResponsivePopoverContent: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("./saved-views/view-card", () => ({
  ViewCard: ({
    view,
    onNavigate,
  }: {
    view: { id: number; name: string; layoutType: string };
    onNavigate: (view: { id: number; layoutType: string }) => void;
  }) => (
    <button type="button" onClick={() => onNavigate(view)}>
      {view.name}
    </button>
  ),
}));

jest.mock("./saved-views/create-view-sheet", () => ({
  CreateViewSheet: () => null,
}));

jest.mock("./saved-views/rename-view-dialog", () => ({
  RenameViewDialog: () => null,
}));

beforeEach(() => {
  replace.mockClear();
  window.history.replaceState({}, "", "/build/42/workload?status=TODO");
});

it("opens a saved view on the project Issues route from Workload", () => {
  render(<SavedViewsMenu projectId={42} />);

  fireEvent.click(screen.getByRole("button", { name: "Todo list" }));

  expect(replace).toHaveBeenCalledWith(
    "/build/42/issues?viewId=9&view=list&status=TODO",
    { scroll: false },
  );
});
