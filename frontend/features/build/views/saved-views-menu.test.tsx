import { fireEvent, render, screen } from "@testing-library/react";
import { SavedViewsMenu } from "./saved-views-menu";

const replace = jest.fn();

function viewCardMock(): jest.Mock {
  return jest.requireMock<{ ViewCard: jest.Mock }>("./saved-views/view-card").ViewCard;
}

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams("status=TODO"),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(false),
  useCanState: () => "allowed",
}));

jest.mock("@/hooks/api/build/advanced", () => ({
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
  ViewCard: jest.fn(
    ({
      view,
      onNavigate,
    }: {
      view: { id: number; name: string; layoutType: string };
      onNavigate: (view: { id: number; layoutType: string }) => void;
      canManage: boolean;
      isPinned: boolean;
      currentUserId?: string;
      onTogglePin: () => void;
      onRename: () => void;
      onDelete: () => void;
    }) => (
      <button type="button" onClick={() => onNavigate(view)}>
        {view.name}
      </button>
    ),
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
  jest.requireMock("@/hooks/api/access").useCan.mockReturnValue(false);
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

describe("SavedViewsMenu — owner permission gate on edit/delete actions", () => {
  beforeEach(() => {
    viewCardMock().mockClear();
  });

  it("non-owner: ViewCard receives canManage=false when useCan returns false", () => {
    viewCardMock().mockImplementationOnce(
      ({ canManage }: { canManage: boolean }) => (
        <div data-testid={`view-card-can-manage-${String(canManage)}`} />
      ),
    );
    render(<SavedViewsMenu projectId={42} />);
    expect(screen.getByTestId("view-card-can-manage-false")).toBeInTheDocument();
  });

  it("owner (useCan=true): ViewCard receives canManage=true", () => {
    jest.requireMock("@/hooks/api/access").useCan.mockReturnValue(true);
    viewCardMock().mockImplementationOnce(
      ({
        canManage,
        view,
        onNavigate,
      }: {
        canManage: boolean;
        view: { id: number; name: string; layoutType: string };
        onNavigate: (v: { id: number; layoutType: string }) => void;
      }) => (
        <div data-testid={`view-card-can-manage-${String(canManage)}`}>
          <button type="button" onClick={() => onNavigate(view)}>
            {view.name}
          </button>
        </div>
      ),
    );
    render(<SavedViewsMenu projectId={42} />);
    expect(screen.getByTestId("view-card-can-manage-true")).toBeInTheDocument();
    jest.requireMock("@/hooks/api/access").useCan.mockReturnValue(false);
  });
});
