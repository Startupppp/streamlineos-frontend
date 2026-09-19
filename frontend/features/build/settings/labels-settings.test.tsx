import { render, screen } from "@testing-library/react";
import { LabelsSettings } from "./labels-settings";

let mockCanManage = false;

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => permission === "build:manage" && mockCanManage,
}));

jest.mock("@/hooks/api/build/labels", () => ({
  useOrgLabels: () => ({
    data: [
      { id: 1, orgId: "org-1", name: "Bug", color: "#ff0000" },
      { id: 2, orgId: "org-1", name: "Feature", color: "#00ff00" },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreateLabel: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateLabel: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteLabel: () => ({ mutate: jest.fn(), isPending: false }),
}));

beforeEach(() => {
  mockCanManage = false;
});

describe("LabelsSettings — build:manage gates", () => {
  it("shows the Add Label button when the viewer holds build:manage", () => {
    mockCanManage = true;
    render(<LabelsSettings />);
    expect(screen.getByRole("button", { name: /add label/i })).toBeInTheDocument();
  });

  it("hides the Add Label button when the viewer lacks build:manage", () => {
    render(<LabelsSettings />);
    expect(screen.queryByRole("button", { name: /add label/i })).not.toBeInTheDocument();
  });

  it("shows a Delete button on every label row when the viewer holds build:manage", () => {
    mockCanManage = true;
    render(<LabelsSettings />);
    expect(screen.getAllByRole("button", { name: "Delete label" })).toHaveLength(2);
  });

  it("hides all Delete buttons when the viewer lacks build:manage", () => {
    render(<LabelsSettings />);
    expect(screen.queryByRole("button", { name: "Delete label" })).not.toBeInTheDocument();
  });

  it("shows an edit control on every label row when the viewer holds build:manage", () => {
    mockCanManage = true;
    render(<LabelsSettings />);
    expect(screen.getByRole("button", { name: "Edit label Bug" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit label Feature" })).toBeInTheDocument();
  });

  it("hides edit controls on label rows when the viewer lacks build:manage so the list is read-only", () => {
    render(<LabelsSettings />);
    expect(screen.queryByRole("button", { name: /edit label/i })).not.toBeInTheDocument();
  });

  it("still renders every label name when the viewer lacks build:manage", () => {
    render(<LabelsSettings />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
  });
});
