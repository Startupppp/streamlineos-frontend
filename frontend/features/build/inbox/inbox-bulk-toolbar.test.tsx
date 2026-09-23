import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxBulkToolbar } from "./inbox-bulk-toolbar";

const noop = () => undefined;

function renderToolbar(selectedIds: number[], totalVisible = 5) {
  return render(
    <InboxBulkToolbar
      selectedIds={new Set(selectedIds)}
      totalVisible={totalVisible}
      onSelectAll={noop}
      onDeselectAll={noop}
      onBulkMarkRead={noop}
      onBulkArchive={noop}
      onBulkDelete={noop}
      isMutating={false}
    />,
  );
}

describe("InboxBulkToolbar — selection display", () => {
  it("shows the select-all checkbox when toolbar is rendered", () => {
    renderToolbar([], 5);
    expect(screen.getByRole("checkbox", { name: /select all/i })).toBeInTheDocument();
  });

  it("shows the selected count when items are selected", () => {
    renderToolbar([1, 2, 3]);
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
  });

  it("shows bulk action buttons when items are selected", () => {
    renderToolbar([1, 2]);
    expect(screen.getByRole("button", { name: /mark.*read/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("does not show bulk action buttons when nothing is selected", () => {
    renderToolbar([]);
    expect(screen.queryByRole("button", { name: /mark.*read/i })).toBeNull();
  });
});

describe("InboxBulkToolbar — delete goes through ConfirmDialog", () => {
  it("does not call onBulkDelete immediately when delete is clicked", async () => {
    const onBulkDelete = jest.fn();
    const user = userEvent.setup();
    render(
      <InboxBulkToolbar
        selectedIds={new Set([1, 2])}
        totalVisible={5}
        onSelectAll={noop}
        onDeselectAll={noop}
        onBulkMarkRead={noop}
        onBulkArchive={noop}
        onBulkDelete={onBulkDelete}
        isMutating={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onBulkDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("calls onBulkDelete after confirming the dialog", async () => {
    const onBulkDelete = jest.fn();
    const user = userEvent.setup();
    render(
      <InboxBulkToolbar
        selectedIds={new Set([1])}
        totalVisible={5}
        onSelectAll={noop}
        onDeselectAll={noop}
        onBulkMarkRead={noop}
        onBulkArchive={noop}
        onBulkDelete={onBulkDelete}
        isMutating={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /delete 1 notification/i }));
    expect(onBulkDelete).toHaveBeenCalledTimes(1);
  });

  it("shows the correct count in the confirm dialog label", async () => {
    const user = userEvent.setup();
    renderToolbar([1, 2, 3]);
    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByRole("button", { name: /delete 3 notifications/i })).toBeInTheDocument();
  });
});

describe("InboxBulkToolbar — selectAll / deselectAll", () => {
  it("calls onSelectAll when the checkbox is clicked while unchecked", async () => {
    const onSelectAll = jest.fn();
    const user = userEvent.setup();
    render(
      <InboxBulkToolbar
        selectedIds={new Set()}
        totalVisible={5}
        onSelectAll={onSelectAll}
        onDeselectAll={noop}
        onBulkMarkRead={noop}
        onBulkArchive={noop}
        onBulkDelete={noop}
        isMutating={false}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: /select all/i }));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it("calls onDeselectAll when the checkbox is clicked while fully checked", async () => {
    const onDeselectAll = jest.fn();
    const user = userEvent.setup();
    render(
      <InboxBulkToolbar
        selectedIds={new Set([1, 2, 3, 4, 5])}
        totalVisible={5}
        onSelectAll={noop}
        onDeselectAll={onDeselectAll}
        onBulkMarkRead={noop}
        onBulkArchive={noop}
        onBulkDelete={noop}
        isMutating={false}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: /select all/i }));
    expect(onDeselectAll).toHaveBeenCalledTimes(1);
  });
});
