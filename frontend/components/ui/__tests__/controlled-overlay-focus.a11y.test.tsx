import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


function ConfirmHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Row actions
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete ticket"
        description="This cannot be undone."
        destructive
        confirmLabel="Delete"
        onConfirm={() => setOpen(false)}
      />
    </div>
  );
}

function DrawerHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Filters
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Narrow the list.</DrawerDescription>
          <button type="button" onClick={() => setOpen(false)}>
            Apply
          </button>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button">Open dialog</button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Conversation action</DialogTitle>
        <DialogDescription>Complete a chat action.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

describe("a confirmation opened from a row action returns focus to it", () => {
  it("restores focus to the opener when dismissed with Escape", async () => {
    const user = userEvent.setup();
    render(<ConfirmHarness />);
    const opener = screen.getByRole("button", { name: "Row actions" });
    opener.focus();
    await user.click(opener);
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("restores focus to the opener after the destructive action is confirmed", async () => {
    const user = userEvent.setup();
    render(<ConfirmHarness />);
    const opener = screen.getByRole("button", { name: "Row actions" });
    opener.focus();
    await user.click(opener);
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("renders no trigger of its own, so the restore cannot be coming from one", () => {
    render(<ConfirmHarness />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName("Row actions");
  });
});

describe("a drawer opened from a filter button returns focus to it", () => {
  it("restores focus to the opener when dismissed with Escape", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const opener = screen.getByRole("button", { name: "Filters" });
    opener.focus();
    await user.click(opener);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

describe("a responsive dialog always exposes an explicit close action", () => {
  it("renders a labelled close button without a responsive hidden utility", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const close = await screen.findByRole("button", { name: "Close" });
    expect(close.className.split(/\s+/)).not.toContain("hidden");

    await user.click(close);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
