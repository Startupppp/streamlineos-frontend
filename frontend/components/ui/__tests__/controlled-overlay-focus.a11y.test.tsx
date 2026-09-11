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

/**
 * S15 found that every controlled `Dialog` and `Sheet` in the product dropped
 * focus onto `<body>` on close, because Radix's `DialogContentModal` cancels
 * FocusScope's natural restore and then focuses a `DialogTrigger` that a
 * controlled shell does not have. `SheetContent` and `DialogContent` were
 * fixed; `AlertDialogContent` was not, and it is the same primitive underneath
 * — `AlertDialogPrimitive.Content` renders `DialogPrimitive.Content`.
 *
 * That matters more than it sounds, because `ConfirmDialog`'s own type offers
 * a controlled mode with no trigger (`{ open, onOpenChange }`), and the
 * overlay ladder says every destructive action goes through `ConfirmDialog`.
 * A delete confirmed from a row menu therefore left the keyboard at the top of
 * the document, on the exact interaction where knowing what happened matters
 * most. WCAG 2.4.3.
 *
 * `Drawer` is asserted beside it because the ladder sends every rung-2 popover
 * and rung-3/4 filter panel through it below `md`, so on a phone it is the
 * dominant overlay in the product and nothing had ever measured it.
 */

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
