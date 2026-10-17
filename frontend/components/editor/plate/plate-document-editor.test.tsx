import { act, render, screen, waitFor } from "@testing-library/react";
import { createPlateEditor, Plate, PlateContent } from "platejs/react";

describe("Plate document editor DOM ownership", () => {
  it("resolves the mounted contenteditable through the public editor DOM API", () => {
    const editor = createPlateEditor({
      value: [{ type: "p", children: [{ text: "Release notes" }] }],
    });
    render(
      <Plate editor={editor}>
        <PlateContent aria-label="Document content" />
      </Plate>,
    );
    const content = screen.getByRole("textbox", { name: "Document content" });

    expect(content).toHaveAttribute("contenteditable", "true");
    expect(editor.api.toDOMNode(editor)).toBe(content);
  });

  it("focuses the mounted editor and restores its selection through public transforms", async () => {
    const editor = createPlateEditor({
      value: [{ type: "p", children: [{ text: "Release notes" }] }],
    });
    render(
      <Plate editor={editor}>
        <PlateContent aria-label="Document content" />
      </Plate>,
    );
    const content = screen.getByRole("textbox", { name: "Document content" });
    const selection = {
      anchor: { path: [0, 0], offset: 3 },
      focus: { path: [0, 0], offset: 3 },
    };

    act(() => editor.tf.focus({ at: selection }));
    await waitFor(() => expect(content).toHaveFocus());
    expect(editor.selection).toEqual(selection);
    expect(document.getSelection()?.anchorNode?.textContent).toBe("Release notes");
    expect(document.getSelection()?.anchorOffset).toBe(3);

    act(() => editor.tf.blur());
    expect(content).not.toHaveFocus();
    act(() => editor.tf.focus());
    await waitFor(() => expect(content).toHaveFocus());
    expect(editor.selection).toEqual(selection);
    expect(document.getSelection()?.anchorOffset).toBe(3);
  });
});
