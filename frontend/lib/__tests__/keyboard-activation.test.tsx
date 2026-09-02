import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  activationProps,
  isActivationKey,
  propagationShield,
} from "@/lib/keyboard-activation";

describe("a click target that is not a button", () => {
  it("is announced as a button and reachable by tab", async () => {
    const activate = jest.fn();
    render(<div {...activationProps(activate, "Open ticket")}>Ticket</div>);

    const target = screen.getByRole("button", { name: "Open ticket" });
    await userEvent.tab();
    expect(target).toHaveFocus();
  });

  it("activates on Enter", async () => {
    const activate = jest.fn();
    render(<div {...activationProps(activate, "Open ticket")}>Ticket</div>);

    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("activates on Space, and does not scroll the page doing it", async () => {
    const activate = jest.fn();
    render(<div {...activationProps(activate)}>Ticket</div>);

    screen.getByRole("button").focus();
    await userEvent.keyboard(" ");
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("BITE PROOF — an unrelated key does not activate it", async () => {
    const activate = jest.fn();
    render(<div {...activationProps(activate)}>Ticket</div>);

    screen.getByRole("button").focus();
    await userEvent.keyboard("a");
    expect(activate).not.toHaveBeenCalled();
  });

  it("leaves the accessible name off when the content already carries it", () => {
    render(<div {...activationProps(jest.fn())}>Ticket ABC-1</div>);
    expect(screen.getByRole("button")).toHaveAccessibleName("Ticket ABC-1");
  });
});

describe("a shield inside a clickable row", () => {
  function Row({ onRowActivate }: { onRowActivate: () => void }) {
    return (
      <div {...activationProps(onRowActivate, "Open row")}>
        <span {...propagationShield}>
          <button type="button">Inner</button>
        </span>
      </div>
    );
  }

  it("stops a click inside it from activating the row", async () => {
    const onRowActivate = jest.fn();
    render(<Row onRowActivate={onRowActivate} />);
    await userEvent.click(screen.getByRole("button", { name: "Inner" }));
    expect(onRowActivate).not.toHaveBeenCalled();
  });

  it("stops a key press inside it from activating the row", async () => {
    const onRowActivate = jest.fn();
    render(<Row onRowActivate={onRowActivate} />);
    screen.getByRole("button", { name: "Inner" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onRowActivate).not.toHaveBeenCalled();
  });
});

describe("isActivationKey", () => {
  it("accepts Enter and Space and nothing else", () => {
    const keys = ["Enter", " ", "Escape", "Tab", "a"];
    const accepted = keys.filter((key) =>
      isActivationKey({ key } as React.KeyboardEvent),
    );
    expect(accepted).toEqual(["Enter", " "]);
  });
});
