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

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const PROJECTS = {
  data: [
    { id: 6, name: "Build QA Sandbox", key: "BQS" },
    { id: 1, name: "StreamlineOS", key: "STRE" },
  ],
};

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
  mockUseManagedProductProjects.mockReturnValue({ data: PROJECTS, isLoading: false });
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
    expect(mockUseManagedProductProjects).toHaveBeenCalledWith({ managedProductId: 39, limit: 100 });
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
    mockUseManagedProductProjects.mockReturnValue({ data: { data: [] }, isLoading: false });
    render(<Harness row={{ id: 96, message: "CSV please", widget: null }} />);
    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    expect(screen.getByRole("link", { name: "Link a project" })).toHaveAttribute(
      "href",
      "/build/managed-products/39/projects",
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
