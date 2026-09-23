import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PageEditConflict from "./page-edit-conflict";

const CONFLICT = {
  currentContentRevision: 11,
  lastEditedByName: "Priya Raman",
  lastEditedAt: "2026-03-04T10:15:00.000Z",
};

function renderConflict(over: Partial<React.ComponentProps<typeof PageEditConflict>> = {}) {
  const onKeepMine = jest.fn();
  const onDiscardMine = jest.fn();
  render(
    <PageEditConflict
      conflict={CONFLICT}
      isReloading={false}
      onKeepMine={onKeepMine}
      onDiscardMine={onDiscardMine}
      {...over}
    />,
  );
  return { onKeepMine, onDiscardMine };
}

describe("PageEditConflict", () => {
  it("names who took the page and when, rather than an anonymous failure", () => {
    renderConflict();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Priya Raman");
    expect(alert).toHaveTextContent("saved a newer version");
    expect(screen.getByTitle(/2026/)).toBeInTheDocument();
  });

  it("still offers both ways out when the server sent no attribution", () => {
    renderConflict({
      conflict: { currentContentRevision: 11, lastEditedByName: null, lastEditedAt: null },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Someone else");
    expect(screen.getByRole("button", { name: "Keep my version" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load theirs" })).toBeInTheDocument();
  });

  it("keeps the editor's work with one click — the safe path needs no confirmation", async () => {
    const user = userEvent.setup();
    const { onKeepMine, onDiscardMine } = renderConflict();

    await user.click(screen.getByRole("button", { name: "Keep my version" }));

    expect(onKeepMine).toHaveBeenCalledTimes(1);
    expect(onDiscardMine).not.toHaveBeenCalled();
  });

  it("never discards the editor's work on a single click — the destructive path is confirmed first", async () => {
    const user = userEvent.setup();
    const { onDiscardMine } = renderConflict();

    await user.click(screen.getByRole("button", { name: "Load theirs" }));

    expect(onDiscardMine).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "Load their version?" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard mine and load theirs" }));

    expect(onDiscardMine).toHaveBeenCalledTimes(1);
  });

  it("lets the editor back out of the confirmation without losing anything", async () => {
    const user = userEvent.setup();
    const { onDiscardMine, onKeepMine } = renderConflict();

    await user.click(screen.getByRole("button", { name: "Load theirs" }));
    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(onDiscardMine).not.toHaveBeenCalled();
    expect(onKeepMine).not.toHaveBeenCalled();
  });
});
