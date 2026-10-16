import { fireEvent, render, screen } from "@testing-library/react";
import { BulkDecideDialog } from "./reviews-bulk-decide-dialog";

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn(), useCanState: jest.fn() }));
jest.mock("@/hooks/api/kb/page-reviews", () => ({ useBulkDecidePageReviews: jest.fn() }));

const { useCan, useCanState } = jest.requireMock<{ useCan: jest.Mock; useCanState: jest.Mock }>("@/hooks/api/access");
const { useBulkDecidePageReviews } = jest.requireMock<{ useBulkDecidePageReviews: jest.Mock }>("@/hooks/api/kb/page-reviews");
const mutate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
  useCanState.mockReturnValue("granted");
  useBulkDecidePageReviews.mockReturnValue({ mutate, isPending: false });
});

function renderDialog(ids = [11, 12]) {
  return render(<BulkDecideDialog ids={ids} onCancel={jest.fn()} onComplete={jest.fn()} />);
}

it("names the decision and note controls for keyboard and screen-reader users", () => {
  renderDialog();
  expect(screen.getByRole("combobox", { name: "Decision" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /Note/ })).toBeInTheDocument();
});

it("submits an approved decision when review management is granted", () => {
  renderDialog();
  fireEvent.click(screen.getByRole("button", { name: "Approve all" }));
  expect(mutate).toHaveBeenCalledWith(
    { ids: [11, 12], decision: "approved", note: undefined },
    expect.anything(),
  );
});

it("disables decision controls when permission is pending or revoked", () => {
  const view = renderDialog();
  useCan.mockReturnValue(false);
  useCanState.mockReturnValue("loading");
  view.rerender(<BulkDecideDialog ids={[11, 12]} onCancel={jest.fn()} onComplete={jest.fn()} />);

  expect(screen.getByRole("status")).toHaveTextContent("Checking review decision access");
  expect(screen.getByRole("combobox", { name: "Decision" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: /Note/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Approve all" })).toBeDisabled();
  useCanState.mockReturnValue("denied");
  view.rerender(<BulkDecideDialog ids={[11, 12]} onCancel={jest.fn()} onComplete={jest.fn()} />);
  expect(screen.getByRole("status")).toHaveTextContent("no longer have permission");
  fireEvent.click(screen.getByRole("button", { name: "Approve all" }));
  expect(mutate).not.toHaveBeenCalled();
});

it("does not submit an empty selection", () => {
  renderDialog([]);
  expect(screen.getByRole("button", { name: "Approve all" })).toBeDisabled();
  expect(mutate).not.toHaveBeenCalled();
});
