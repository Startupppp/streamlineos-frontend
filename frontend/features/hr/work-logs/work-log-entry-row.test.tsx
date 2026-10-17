import { fireEvent, render, screen } from "@testing-library/react";
import { WorkLogEntryRow } from "./work-log-entry-row";

const DATE = new Date("2026-10-08T12:00:00.000Z");

function renderRow(initialContent: string) {
  return render(
    <WorkLogEntryRow
      date={DATE}
      initialContent={initialContent}
      onSave={jest.fn()}
      isSaving={false}
      searchTerm=""
    />,
  );
}

describe("WorkLogEntryRow server refreshes", () => {
  it("adopts a changed initial value while the local editor is clean", () => {
    const { rerender } = renderRow("Original");
    rerender(
      <WorkLogEntryRow
        date={DATE}
        initialContent="Updated by server"
        onSave={jest.fn()}
        isSaving={false}
        searchTerm=""
      />,
    );
    expect(screen.getByRole("textbox", { name: /work log/i })).toHaveValue("Updated by server");
  });

  it("does not overwrite a dirty local draft when a server refresh arrives", () => {
    const { rerender } = renderRow("Original");
    const editor = screen.getByRole("textbox", { name: /work log/i });
    fireEvent.change(editor, { target: { value: "Local draft" } });

    rerender(
      <WorkLogEntryRow
        date={DATE}
        initialContent="Updated by server"
        onSave={jest.fn()}
        isSaving={false}
        searchTerm=""
      />,
    );
    expect(screen.getByRole("textbox", { name: /work log/i })).toHaveValue("Local draft");
  });
});
