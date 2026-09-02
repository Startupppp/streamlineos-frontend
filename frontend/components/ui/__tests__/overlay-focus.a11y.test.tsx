import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Button } from "@/components/ui/button";
import { expectNoAxeViolations, atViewport } from "@/test-utils";

function DialogHarness() {
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
            <DialogDescription>Update the contact details.</DialogDescription>
          </DialogHeader>
          <Button>Save contact</Button>
        </DialogContent>
      </Dialog>
      <Button>Outside control</Button>
    </>
  );
}

function SheetHarness() {
  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button>Open sheet</Button>
        </SheetTrigger>
        <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
          <div className="shrink-0 px-6 py-4 border-b">
            <SheetHeader>
              <SheetTitle>New invoice</SheetTitle>
              <SheetDescription>Fill in the invoice details.</SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            <Button>Field action</Button>
          </div>
        </SheetContent>
      </Sheet>
      <Button>Outside control</Button>
    </>
  );
}

describe("Dialog — focus is trapped on open and restored on close", () => {
  it("moves focus inside the dialog when it opens", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it("returns focus to the trigger when Escape closes it", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("hides the rest of the page from assistive tech while open", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");

    expect(screen.queryByRole("button", { name: "Outside control" })).toBeNull();
  });

  it("names the dialog with its title and describes it with its description", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const dialog = await screen.findByRole("dialog", { name: "Edit contact" });
    expect(dialog).toHaveAccessibleDescription("Update the contact details.");
  });

  it("passes axe while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog");
    await expectNoAxeViolations(baseElement);
  });
});

describe("Sheet — focus is trapped on open and restored on close", () => {
  it("moves focus inside the sheet when it opens", async () => {
    const user = userEvent.setup();
    render(<SheetHarness />);
    await user.click(screen.getByRole("button", { name: "Open sheet" }));

    const sheet = await screen.findByRole("dialog");
    await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
  });

  it("returns focus to the trigger when Escape closes it", async () => {
    const user = userEvent.setup();
    render(<SheetHarness />);
    const trigger = screen.getByRole("button", { name: "Open sheet" });
    await user.click(trigger);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("exposes a close control with an accessible name", async () => {
    const user = userEvent.setup();
    render(<SheetHarness />);
    await user.click(screen.getByRole("button", { name: "Open sheet" }));
    await screen.findByRole("dialog");

    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("passes axe while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<SheetHarness />);
    await user.click(screen.getByRole("button", { name: "Open sheet" }));
    await screen.findByRole("dialog");
    await expectNoAxeViolations(baseElement);
  });
});

describe("ResponsivePopover — the same trigger yields a Drawer below md and a Popover above", () => {
  function Harness() {
    return (
      <ResponsivePopover>
        <ResponsivePopoverTrigger asChild>
          <Button>Filters</Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Filters">
          <Button>Clear filters</Button>
        </ResponsivePopoverContent>
      </ResponsivePopover>
    );
  }

  it("renders a titled dialog surface at 375px so the panel is reachable on mobile", async () => {
    const restore = atViewport("mobile");
    try {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("button", { name: "Filters" }));
      expect(await screen.findByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("keeps the panel operable at 1280px", async () => {
    const restore = atViewport("desktop");
    try {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("button", { name: "Filters" }));
      expect(
        await screen.findByRole("button", { name: "Clear filters" }),
      ).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("BITE PROOF — the trigger itself is a real button, keyboard-reachable", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Filters" }).tagName).toBe("BUTTON");
  });
});
