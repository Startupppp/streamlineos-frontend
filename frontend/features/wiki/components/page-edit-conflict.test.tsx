import { render, screen, waitFor } from "@testing-library/react";
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
  const onCompare = jest.fn().mockResolvedValue({ title: "Their title", body: "Their body" });
  render(
    <PageEditConflict
      conflict={CONFLICT}
      isReloading={false}
      localTitle="My title"
      localBody="My body"
      onKeepMine={onKeepMine}
      onDiscardMine={onDiscardMine}
      onCompare={onCompare}
      {...over}
    />,
  );
  return { onKeepMine, onDiscardMine, onCompare };
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

  it("keeps local edits paused when the server cannot identify its current revision", () => {
    renderConflict({
      conflict: { currentContentRevision: null, lastEditedByName: null, lastEditedAt: null },
    });

    expect(screen.getByRole("button", { name: "Keep my version" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("latest revision could not be confirmed");
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

  it("shows which local fields the user has modified when pendingFields is provided", () => {
    renderConflict({ pendingFields: ["title", "content"] });

    expect(screen.getByRole("alert")).toHaveTextContent("Your local changes: title and body");
  });

  it("shows no local-changes line when pendingFields is empty", () => {
    renderConflict({ pendingFields: [] });

    expect(screen.queryByText(/your local changes/i)).toBeNull();
  });

  it("deduplicates content and contentText in the field summary", () => {
    renderConflict({ pendingFields: ["content", "contentText"] });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Your local changes: body");
    expect(alert).not.toHaveTextContent("body and body");
  });

  it("compares only pending title and body fields after an accessible action", async () => {
    const user = userEvent.setup();
    const { onCompare } = renderConflict({ pendingFields: ["title", "contentText"] });

    await user.tab();
    expect(screen.getByRole("button", { name: "Compare versions" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onCompare).toHaveBeenCalledTimes(1);
    const comparison = await screen.findByRole("region", { name: "Version comparison" });
    expect(comparison).toHaveTextContent("My title");
    expect(comparison).toHaveTextContent("Their title");
    expect(comparison).toHaveTextContent("My body");
    expect(comparison).toHaveTextContent("Their body");
  });

  it("omits the body when only the title is pending", async () => {
    const user = userEvent.setup();
    renderConflict({ pendingFields: ["title"] });

    await user.click(screen.getByRole("button", { name: "Compare versions" }));

    const comparison = await screen.findByRole("region", { name: "Version comparison" });
    expect(comparison).toHaveTextContent("My title");
    expect(comparison).not.toHaveTextContent("My body");
    expect(comparison).not.toHaveTextContent("Their body");
  });

  it("retains the conflict action and offers retry when comparison read fails", async () => {
    const user = userEvent.setup();
    const onCompare = jest.fn().mockRejectedValue(new Error("Offline"));
    renderConflict({ pendingFields: ["content"], onCompare });

    await user.click(screen.getByRole("button", { name: "Compare versions" }));

    await waitFor(() => expect(screen.getByText("Couldn't compare versions. Try again.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Compare versions" })).toBeEnabled();
    expect(screen.queryByRole("region", { name: "Version comparison" })).toBeNull();
  });
});
