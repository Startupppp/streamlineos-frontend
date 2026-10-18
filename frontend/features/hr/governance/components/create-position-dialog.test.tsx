import { fireEvent, render, screen } from "@testing-library/react";
import { CreatePositionDialog } from "./create-position-dialog";

const refetch = jest.fn();
let statusesState: {
  data: Array<{ id: number; name: string; isActive: boolean }> | undefined;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
};

jest.mock("@/features/hr/governance/hooks/use-positions", () => ({
  usePositionStatuses: () => ({ ...statusesState, refetch }),
  useCreatePosition: () => ({ mutate: jest.fn(), isPending: false }),
  useSeedPositionStatuses: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/hr/employee-departments", () => ({
  useHrDepartments: () => ({ data: [] }),
}));

function renderDialog() {
  return render(<CreatePositionDialog open onOpenChange={jest.fn()} />);
}

describe("create position status field", () => {
  beforeEach(() => {
    refetch.mockReset();
  });

  it("preselects the open status once statuses have loaded so the form can be saved", () => {
    statusesState = {
      data: [
        { id: 1, name: "draft", isActive: true },
        { id: 2, name: "open", isActive: true },
      ],
      isError: false,
      error: null,
      isFetching: false,
    };
    renderDialog();

    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("open");
  });

  it("shows why statuses are missing and offers a retry when the status read fails", () => {
    statusesState = { data: undefined, isError: true, error: new Error("Network down"), isFetching: false };
    renderDialog();

    expect(screen.getByRole("alert")).toHaveTextContent("Position statuses could not load");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the status select disabled while statuses have not arrived, not an empty open list", () => {
    statusesState = { data: undefined, isError: false, error: null, isFetching: false };
    renderDialog();

    const trigger = screen.getByRole("combobox", { name: "Status" });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent("Loading statuses…");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
