import { act, render, screen, waitFor } from "@testing-library/react";
import { createPlateEditor, Plate, PlateContent } from "platejs/react";
import PlateDocumentEditor from "./plate-document-editor";

jest.mock("./plate-plugins", () => ({
  buildPlugins: () => [],
  MAX_FILES_PER_DROP: 5,
}));

jest.mock("./plate-page-link-picker", () => ({
  usePageLinkPicker: () => ({
    picker: null,
    checkTrigger: jest.fn(),
    selectPageLink: jest.fn(),
    dismissPicker: jest.fn(),
  }),
  PageLinkPickerDropdown: () => null,
}));

jest.mock("./toolbar/fixed-toolbar", () => ({
  FixedToolbar: () => null,
}));

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

describe("PlateDocumentEditor — contentKey update", () => {
  it("fires onChange with new content (not empty) when contentKey changes", async () => {
    const onChange = jest.fn();
    const oldValue = [{ type: "p", children: [{ text: "old" }] }];
    const newValue = [{ type: "p", children: [{ text: "new" }] }];

    const { rerender } = render(
      <PlateDocumentEditor value={oldValue} contentKey="k1" onChange={onChange} />,
    );

    onChange.mockClear();

    act(() => {
      rerender(
        <PlateDocumentEditor value={newValue} contentKey="k2" onChange={onChange} />,
      );
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    const emptyValueCalls = onChange.mock.calls.filter(
      ([v]: [unknown]) => Array.isArray(v) && v.length === 0,
    );
    expect(emptyValueCalls).toHaveLength(0);

    const lastValue = onChange.mock.calls.at(-1)?.[0];
    expect(Array.isArray(lastValue) && lastValue.length > 0).toBe(true);
    expect(lastValue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ children: [{ text: "new" }] }),
      ]),
    );
  });
});
