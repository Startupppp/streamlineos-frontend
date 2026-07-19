import { fireEvent, render, screen } from "@testing-library/react";
import { CalendarToolbarPrimaryActions } from "./calendar-toolbar";

describe("CalendarToolbarPrimaryActions", () => {
  it("opens calendar accounts from the header beside Share", () => {
    const onOpenAccounts = jest.fn();

    render(
      <CalendarToolbarPrimaryActions
        activeConnectionCount={1}
        onOpenAccounts={onOpenAccounts}
        onOpenCreate={jest.fn()}
        onOpenCreateTicket={jest.fn()}
      />,
    );

    const shareButton = screen.getByRole("button", { name: "Share" });
    const accountsButton = screen.getByRole("button", {
      name: "Calendar accounts",
    });

    expect(shareButton.compareDocumentPosition(accountsButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(accountsButton);

    expect(onOpenAccounts).toHaveBeenCalledTimes(1);
  });
});
