import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { activationProps } from "@/lib/keyboard-activation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

jest.mock("@/hooks/api/build", () => ({
  useUpdateTicket: () => ({ mutate: jest.fn(), isPending: false }),
}));

import { EditEpicDialog } from "@/features/build/epics/edit-epic-dialog";

const epic = {
  id: 7,
  title: "Widen the stock grain",
  description: "",
  priority: "MEDIUM",
  status: "TODO",
};

/**
 * A sheet opened from a MENU ITEM has no trigger of its own, and the shape a
 * caller reaches for is a hidden proxy button the menu clicks. Radix then
 * restores focus to that proxy on close — an element that is `sr-only`,
 * `aria-hidden` and `tabIndex={-1}`, so a keyboard user lands somewhere they
 * cannot see and a screen reader announces nothing.
 *
 * The corpus scan in `components/__tests__/aria-semantics.contract.test.ts`
 * cannot see this: the proxy is out of the tab order, so it is correctly not a
 * `hiddenFocusable` finding. Only a rendered run reaches it. This is the class
 * of defect an automated pass structurally misses.
 */
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <QueryClientProvider client={new QueryClient()}>
      <button type="button" onClick={() => setOpen(true)}>
        More actions
      </button>
      <EditEpicDialog epic={epic} projectId={1} open={open} onOpenChange={setOpen} />
    </QueryClientProvider>
  );
}

describe("a sheet opened from a menu item", () => {
  it("renders no proxy trigger of its own", () => {
    render(<Harness />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName("More actions");
  });

  it("leaves focus on the real control that opened it when it closes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const actions = screen.getByRole("button", { name: "More actions" });
    actions.focus();
    await user.click(actions);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(actions));
  });

  it("still supports an ordinary visible trigger for callers that have one", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <EditEpicDialog
          epic={epic}
          projectId={1}
          trigger={<span>Edit epic</span>}
        />
      </QueryClientProvider>,
    );
    await user.click(screen.getByText("Edit epic"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("does the same for a Dialog, not just a Sheet", async () => {
    const user = userEvent.setup();
    function DialogHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Row menu
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogTitle>Confirm</DialogTitle>
              <DialogDescription>Body</DialogDescription>
            </DialogContent>
          </Dialog>
        </>
      );
    }
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Row menu" });
    await user.click(opener);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("BITE PROOF — the shape this replaced put an anonymous button in the tab order", () => {
    render(
      <span {...activationProps(() => undefined)}>
        <button className="sr-only" aria-hidden tabIndex={-1}>
          Edit
        </button>
      </span>,
    );
    const wrapper = screen.getByRole("button");
    expect(wrapper).toHaveAttribute("tabindex", "0");
    expect(wrapper).toHaveAccessibleName("");
  });
});
