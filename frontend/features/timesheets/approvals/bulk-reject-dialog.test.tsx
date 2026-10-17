import { fireEvent, render, screen } from "@testing-library/react";
import { BulkRejectDialog } from "./bulk-reject-dialog";

it("preserves a failed-attempt reason while open and clears it for the next open session", () => {
  const props = {
    count: 2,
    onOpenChange: jest.fn(),
    onConfirm: jest.fn(),
    isPending: false,
  };
  const { rerender } = render(<BulkRejectDialog {...props} open />);

  fireEvent.change(screen.getByLabelText(/reason/i), {
    target: { value: "Missing evidence" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^reject$/i }));
  expect(props.onConfirm).toHaveBeenCalledWith("Missing evidence");
  expect(screen.getByLabelText(/reason/i)).toHaveValue("Missing evidence");

  rerender(<BulkRejectDialog {...props} open={false} />);
  rerender(<BulkRejectDialog {...props} open />);
  expect(screen.getByLabelText(/reason/i)).toHaveValue("");
});
