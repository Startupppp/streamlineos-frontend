import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomFieldsSettings } from "./custom-fields-settings";

let mockCanManage = false;
const mockUpdateMutate = jest.fn();

const mockPermissionsAsked: string[] = [];

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => {
    mockPermissionsAsked.push(permission);
    return permission === "build:manage" && mockCanManage;
  },
}));

jest.mock("@/hooks/api/build/custom-fields", () => ({
  useProjectCustomFields: () => ({
    data: [
      { id: 1, name: "Story Points", type: "number", options: null, required: false },
      { id: 2, name: "Priority Label", type: "select", options: ["P0", "P1", "P2"], required: false },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreateProjectCustomField: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateProjectCustomField: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useDeleteProjectCustomField: () => ({ mutate: jest.fn(), isPending: false }),
}));

beforeEach(() => {
  mockCanManage = false;
  mockUpdateMutate.mockReset();
});

describe("CustomFieldsSettings — build:manage gates", () => {
  it("shows the Add Custom Field button when the viewer holds build:manage", () => {
    mockCanManage = true;
    render(<CustomFieldsSettings projectId={1} />);
    expect(screen.getByRole("button", { name: /add custom field/i })).toBeInTheDocument();
  });

  it("hides the Add Custom Field button when the viewer lacks build:manage", () => {
    render(<CustomFieldsSettings projectId={1} />);
    expect(screen.queryByRole("button", { name: /add custom field/i })).not.toBeInTheDocument();
  });

  it("shows a Delete button on every field row when the viewer holds build:manage", () => {
    mockCanManage = true;
    render(<CustomFieldsSettings projectId={1} />);
    expect(screen.getAllByRole("button", { name: "Delete field" })).toHaveLength(2);
  });

  it("hides all Delete buttons when the viewer lacks build:manage", () => {
    render(<CustomFieldsSettings projectId={1} />);
    expect(screen.queryByRole("button", { name: "Delete field" })).not.toBeInTheDocument();
  });

  it("still renders every custom field name when the viewer lacks build:manage", () => {
    render(<CustomFieldsSettings projectId={1} />);
    expect(screen.getByText("Story Points")).toBeInTheDocument();
    expect(screen.getByText("Priority Label")).toBeInTheDocument();
  });

  it("gates on build:manage itself, not on a project-manager standing the backend does not accept", () => {
    mockCanManage = true;
    mockPermissionsAsked.length = 0;
    render(<CustomFieldsSettings projectId={1} />);
    expect(mockPermissionsAsked).toContain("build:manage");
  });
});

describe("CustomFieldsSettings — edit control visibility", () => {
  it("shows an Edit button on every field row when the viewer holds build:manage", () => {
    mockCanManage = true;
    render(<CustomFieldsSettings projectId={1} />);
    expect(screen.getByRole("button", { name: "Edit field Story Points" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit field Priority Label" })).toBeInTheDocument();
  });

  it("hides all Edit buttons when the viewer lacks build:manage so the list is read-only", () => {
    render(<CustomFieldsSettings projectId={1} />);
    expect(screen.queryByRole("button", { name: /edit field/i })).not.toBeInTheDocument();
  });
});

describe("CustomFieldsSettings — edit form submits with changed values", () => {
  it("opening the edit dialog for a field pre-fills the field name", async () => {
    const user = userEvent.setup();
    mockCanManage = true;
    render(<CustomFieldsSettings projectId={1} />);

    await user.click(screen.getByRole("button", { name: "Edit field Story Points" }));

    expect(screen.getByDisplayValue("Story Points")).toBeInTheDocument();
  });

  it("submitting the edit form calls the update mutation with the field id and the changed name", async () => {
    const user = userEvent.setup();
    mockCanManage = true;
    render(<CustomFieldsSettings projectId={1} />);

    await user.click(screen.getByRole("button", { name: "Edit field Story Points" }));

    const nameInput = screen.getByDisplayValue("Story Points");
    await user.clear(nameInput);
    await user.type(nameInput, "SP");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ fieldId: 1, data: expect.objectContaining({ name: "SP" }) }),
        expect.anything(),
      );
    });
  });
});
