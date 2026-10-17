import React, { useRef, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeetingFormSheet } from "./meeting-form-sheet";
import { NewMeetingButton } from "./new-meeting-button";

function MeetingCreationHarness() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <NewMeetingButton
        onBlank={() => setOpen(true)}
        onTemplate={() => setOpen(true)}
        triggerRef={triggerRef}
      />
      <MeetingFormSheet
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSubmitCreate={jest.fn()}
        onSubmitEdit={jest.fn()}
        isPending={false}
        returnFocusRef={triggerRef}
      />
    </>
  );
}

describe("MeetingFormSheet focus management", () => {
  it("returns focus to New Meeting after canceling a sheet opened from its menu", async () => {
    const user = userEvent.setup();
    render(<MeetingCreationHarness />);

    const trigger = screen.getByRole("button", { name: /New Meeting/ });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Blank meeting" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
