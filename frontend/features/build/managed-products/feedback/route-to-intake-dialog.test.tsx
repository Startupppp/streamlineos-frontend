import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  RouteToIntakeDialog,
  useRouteToIntake,
  type IntakeRouteSubmission,
} from "./route-to-intake-dialog";

const mockMutate = jest.fn();
const mockUseManagedProductProjects = jest.fn();

jest.mock("@/hooks/api/build/intake-mutations", () => ({
  useRouteFeedbucketToIntake: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock("@/hooks/api/build/managed-product-projects", () => ({
  useManagedProductProjects: (params: unknown) => mockUseManagedProductProjects(params),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: () => null,
  useCursorPager: jest.fn(() => ({
    cursor: undefined,
    pageNumber: 1,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  })),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <div role="alert" data-testid="error-state">
      Error loading data.
      {onRetry ? <button type="button" onClick={onRetry}>Try again</button> : null}
    </div>
  ),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const PROJECTS = {
  data: [
    { id: 6, name: "Build QA Sandbox", key: "BQS" },
    { id: 1, name: "StreamlineOS", key: "STRE" },
  ],
  pagination: { hasMore: false, nextCursor: null, limit: 25 },
};

const { useCursorPager: mockUseCursorPager } = jest.requireMock(
  "@/components/ui/table-pagination",
) as { useCursorPager: jest.Mock };

function Harness({ row }: { row: IntakeRouteSubmission }) {
  const routing = useRouteToIntake();
  const handleClick = () => routing.handleRouteToIntake(row);
  return (
    <>
      <button type="button" onClick={handleClick}>Route</button>
      {routing.target ? (
        <RouteToIntakeDialog
          managedProductId={39}
          submission={routing.target}
          mutation={routing.mutation}
          onOpenChange={routing.handleTargetOpenChange}
        />
      ) : null}
    </>
  );
}

beforeEach(() => {
  mockMutate.mockReset();
  mockUseManagedProductProjects.mockReturnValue({ data: PROJECTS, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  mockUseCursorPager.mockReturnValue({ cursor: undefined, pageNumber: 1, hasPrevious: false, goNext: jest.fn(), goPrevious: jest.fn(), reset: jest.fn() });
});

describe("route feedback to Intake", () => {
  it("routes directly to the widget project without asking", () => {
    render(<Harness row={{ id: 95, message: "Export", widget: { projectId: 12 } }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    expect(mockMutate).toHaveBeenCalledWith({ submissionId: 95, projectId: 12 }, expect.any(Object));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("routes directly to the widget default project", () => {
    render(<Harness row={{ id: 95, message: "Export", widget: { projectId: null, defaultProjectId: 9 } }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    expect(mockMutate).toHaveBeenCalledWith({ submissionId: 95, projectId: 9 }, expect.any(Object));
  });

  it("asks for a linked project when the widget has none and sends the chosen project", () => {
    render(<Harness row={{ id: 96, message: "CSV please", widget: { projectId: null } }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    expect(mockMutate).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("CSV please");
    fireEvent.click(within(dialog).getByRole("radio", { name: /StreamlineOS/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Route" }));
    expect(mockMutate).toHaveBeenCalledWith(
      { submissionId: 96, projectId: 1, projectChosen: true },
      expect.any(Object),
    );
  });

  it("keeps the route action disabled until a project is chosen", () => {
    render(<Harness row={{ id: 96, message: "CSV please", widget: null }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Route" })).toBeDisabled();
  });

  it("points to linking a project when the product has none", () => {
    mockUseManagedProductProjects.mockReturnValue({ data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 25 } }, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    render(<Harness row={{ id: 96, message: "CSV please", widget: null }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    expect(screen.getByRole("link", { name: "Link a project" })).toHaveAttribute(
      "href",
      "/build/managed-products/39/projects",
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});

describe("RouteToIntakeDialog — error and retry states (MP-02)", () => {
  it("renders an error state with retry when the projects list fails, so a failed read is never reported as no linked projects", () => {
    const mockRefetch = jest.fn();
    mockUseManagedProductProjects.mockReturnValue({
      data: undefined, isLoading: false, isError: true, error: new Error("fail"), refetch: mockRefetch,
    });
    render(<Harness row={{ id: 96, message: "CSV", widget: null }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByText("Link a project")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open when retrying after a failed projects fetch", () => {
    mockUseManagedProductProjects.mockReturnValue({
      data: undefined, isLoading: false, isError: true, error: new Error("fail"), refetch: jest.fn(),
    });
    render(<Harness row={{ id: 96, message: "CSV", widget: null }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    const onOpenChange = jest.fn();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows the empty state when projects succeed with no results, not the error state", () => {
    mockUseManagedProductProjects.mockReturnValue({
      data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 25 } },
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    render(<Harness row={{ id: 96, message: "CSV", widget: null }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Link a project" })).toBeInTheDocument();
  });
});

describe("RouteToIntakeDialog — server-side search and cursor pagination (MP-03)", () => {
  it("sends typed search to the server rather than filtering one local page", () => {
    render(<Harness row={{ id: 96, message: "CSV", widget: null }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "build" } });
    expect(mockUseManagedProductProjects).toHaveBeenCalledWith(
      expect.objectContaining({ search: "build", managedProductId: 39 }),
    );
  });

  it("passes cursor to the projects query so projects beyond the first page are reachable", () => {
    mockUseCursorPager.mockReturnValue({
      cursor: "proj-page-2",
      pageNumber: 2,
      hasPrevious: true,
      goNext: jest.fn(),
      goPrevious: jest.fn(),
      reset: jest.fn(),
    });
    mockUseManagedProductProjects.mockReturnValue({
      data: {
        data: [{ id: 77, name: "Late Project", key: "LATE" }],
        pagination: { hasMore: false, nextCursor: null, limit: 25 },
      },
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    render(<Harness row={{ id: 96, message: "CSV", widget: null }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    expect(mockUseManagedProductProjects).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: "proj-page-2" }),
    );
    expect(screen.getByRole("radio", { name: /Late Project/ })).toBeInTheDocument();
  });
});
