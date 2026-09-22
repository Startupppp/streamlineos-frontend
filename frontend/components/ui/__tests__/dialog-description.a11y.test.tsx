import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Button } from "@/components/ui/button";
import { atViewport, expectNoAxeViolations } from "@/test-utils";

const MISSING_DESCRIPTION = /Missing `Description`|aria-describedby/;

interface ConsoleRecorder {
  matched: () => string[];
  restore: () => void;
}

function recordMissingDescriptionWarnings(): ConsoleRecorder {
  const matched: string[] = [];
  function record(...args: unknown[]): void {
    const text = args.map((arg) => String(arg)).join(" ");
    if (MISSING_DESCRIPTION.test(text)) matched.push(text);
  }
  const warn = jest.spyOn(console, "warn").mockImplementation(record);
  const error = jest.spyOn(console, "error").mockImplementation(record);
  return {
    matched: () => matched,
    restore: () => {
      warn.mockRestore();
      error.mockRestore();
    },
  };
}

function PaletteHarness() {
  return (
    <CommandDialog open onOpenChange={() => undefined}>
      <CommandInput placeholder="Type a command" />
      <CommandList>
        <CommandGroup heading="Pages">
          <CommandItem>Go to dashboard</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function PopoverHarness() {
  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button>Filters</Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="Filters"
        description="Narrow the list down to the rows you care about."
      >
        <Button>Clear filters</Button>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

describe("CommandDialog — the always-mounted palette no longer makes Radix warn about a missing description", () => {
  let recorder: ConsoleRecorder;

  beforeEach(() => {
    recorder = recordMissingDescriptionWarnings();
  });

  afterEach(() => {
    recorder.restore();
  });

  it("logs nothing matching the Radix missing-description warning on the desktop Dialog branch, the branch that fired on every authenticated route", async () => {
    render(<PaletteHarness />);
    await screen.findByRole("dialog");

    expect(recorder.matched()).toEqual([]);
  });

  it("hands a screen reader a description of what the palette does rather than only its title", async () => {
    render(<PaletteHarness />);
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveAccessibleDescription(/search pages, records and actions/i);
  });

  it("keeps that description out of sight so the visible palette is unchanged", async () => {
    render(<PaletteHarness />);
    await screen.findByRole("dialog");
    const description = screen.getByText(/search pages, records and actions/i);

    expect(description.getAttribute("data-slot")).toBe("dialog-description");
  });

  it("describes the mobile Drawer branch too, which vaul renders through its own Radix copy where no warning is emitted at all", async () => {
    const restore = atViewport("mobile");
    try {
      render(<PaletteHarness />);
      const drawer = await screen.findByRole("dialog");

      expect(drawer).toHaveAccessibleDescription(
        /search pages, records and actions/i,
      );
    } finally {
      restore();
    }
  });

  it("passes axe with the palette open", async () => {
    const { baseElement } = render(<PaletteHarness />);
    await screen.findByRole("dialog");

    await expectNoAxeViolations(baseElement);
  });
});

describe("ResponsivePopoverContent — the mobile Drawer branch is described as well as titled", () => {
  it("describes the drawer with the caller's own text rather than a restatement of its title", async () => {
    const restore = atViewport("mobile");
    try {
      const user = userEvent.setup();
      render(<PopoverHarness />);
      await user.click(screen.getByRole("button", { name: "Filters" }));
      const drawer = await screen.findByRole("dialog", { name: "Filters" });

      expect(drawer).toHaveAccessibleDescription(
        "Narrow the list down to the rows you care about.",
      );
    } finally {
      restore();
    }
  });

  it("falls back to a default description so the many callers that pass none are described anyway", async () => {
    const restore = atViewport("mobile");
    try {
      const user = userEvent.setup();
      render(
        <ResponsivePopover>
          <ResponsivePopoverTrigger asChild>
            <Button>Filters</Button>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent title="Filters">
            <Button>Clear filters</Button>
          </ResponsivePopoverContent>
        </ResponsivePopover>,
      );
      await user.click(screen.getByRole("button", { name: "Filters" }));
      const drawer = await screen.findByRole("dialog", { name: "Filters" });

      expect(drawer).toHaveAccessibleDescription(/press escape/i);
    } finally {
      restore();
    }
  });
});
