import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KbNoteSheet } from "./kb-note-sheet";

const mockMutate = jest.fn();
let mockPending = false;

jest.mock("@/hooks/api/kb/sources", () => ({
  useCreateKbSourceNote: () => ({ mutate: mockMutate, isPending: mockPending }),
}));

jest.mock("@/components/shared/app-sheet", () => ({
  AppSheet: ({ open, onOpenChange, children, footer }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    footer: React.ReactNode;
  }) => open ? (
    <div>
      <button type="button" onClick={() => onOpenChange(false)}>Close sheet</button>
      {children}
      {footer}
    </div>
  ) : null,
}));

beforeEach(() => {
  mockPending = false;
  mockMutate.mockClear();
});

it("keeps a pending note draft open when Cancel or the sheet close is requested", async () => {
  const user = userEvent.setup();
  const onOpenChange = jest.fn();
  const view = render(<KbNoteSheet open onOpenChange={onOpenChange} />);
  await user.type(screen.getByRole("textbox", { name: /title/i }), "Policy note");
  await user.type(screen.getByRole("textbox", { name: /content/i }), "Pending content");

  mockPending = true;
  view.rerender(<KbNoteSheet open onOpenChange={onOpenChange} />);
  await user.click(screen.getByRole("button", { name: "Close sheet" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onOpenChange).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox", { name: /title/i })).toHaveValue("Policy note");
  expect(screen.getByRole("textbox", { name: /content/i })).toHaveValue("Pending content");
});

it("keeps the failed note draft and allows retry after the request settles", async () => {
  const user = userEvent.setup();
  const onOpenChange = jest.fn();
  const view = render(<KbNoteSheet open onOpenChange={onOpenChange} />);
  await user.type(screen.getByRole("textbox", { name: /title/i }), "Policy note");
  await user.type(screen.getByRole("textbox", { name: /content/i }), "Retry content");
  await user.click(screen.getByRole("button", { name: "Save note" }));

  expect(mockMutate).toHaveBeenCalledTimes(1);
  mockMutate.mock.calls[0]?.[1].onError(new Error("Network error"));
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox", { name: /title/i })).toHaveValue("Policy note");

  mockPending = false;
  view.rerender(<KbNoteSheet open onOpenChange={onOpenChange} />);
  await user.click(screen.getByRole("button", { name: "Save note" }));
  expect(mockMutate).toHaveBeenCalledTimes(2);
});
