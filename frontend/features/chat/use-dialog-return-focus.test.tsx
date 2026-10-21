import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useDialogReturnFocus } from "./use-dialog-return-focus";

function SearchDialog({ onClose }: { onClose: () => void }) {
  const handleCloseAutoFocus = useDialogReturnFocus("search");
  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }
  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent onCloseAutoFocus={handleCloseAutoFocus} aria-describedby={undefined}>
        <DialogTitle>Search chat</DialogTitle>
        <input aria-label="Search terms" autoFocus />
      </DialogContent>
    </Dialog>
  );
}

function Harness({ transientOpener }: { transientOpener: boolean }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(transientOpener);
  function handleOpen() {
    setMenuOpen(false);
    setOpen(true);
  }
  function handleClose() {
    setOpen(false);
  }
  return (
    <>
      <button type="button" data-chat-opener="search">Search</button>
      {menuOpen ? (
        <button type="button" onClick={handleOpen}>Search from menu</button>
      ) : null}
      {!transientOpener ? (
        <button type="button" onClick={handleOpen}>Open search</button>
      ) : null}
      {open ? <SearchDialog onClose={handleClose} /> : null}
    </>
  );
}

describe("useDialogReturnFocus", () => {
  it("Esc returns focus to the control that opened the dialog", async () => {
    const user = userEvent.setup();
    render(<Harness transientOpener={false} />);
    await user.click(screen.getByRole("button", { name: "Open search" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Search terms" })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: "Open search" })).toHaveFocus());
    expect(document.activeElement).not.toBe(document.body);
  });

  it("falls back to the stable opener when the opener was a menu item that no longer exists", async () => {
    const user = userEvent.setup();
    render(<Harness transientOpener />);
    await user.click(screen.getByRole("button", { name: "Search from menu" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Search terms" })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: "Search" })).toHaveFocus());
  });
});
