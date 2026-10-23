import { uploadEditorMedia, withoutPendingUploads } from "./upload-media";

function placeholderCount(children: unknown): number {
  if (!Array.isArray(children)) return 0;
  return children.reduce<number>(function countIn(total, node: unknown) {
    if (typeof node !== "object" || node === null) return total;
    const element: { type?: unknown; children?: unknown } = node;
    const self = element.type === "placeholder" ? 1 : 0;
    return total + self + placeholderCount(element.children);
  }, 0);
}

describe("withoutPendingUploads — an upload placeholder is transient UI and must never be persisted", () => {
  it("drops a top-level placeholder while keeping the rest of the document", () => {
    const value = [
      { type: "p", children: [{ text: "keep me" }] },
      { type: "placeholder", placeholderId: "abc", mediaType: "img", children: [{ text: "" }] },
    ];

    expect(withoutPendingUploads(value)).toEqual([
      { type: "p", children: [{ text: "keep me" }] },
    ]);
  });

  it("drops a placeholder nested inside a container", () => {
    const value = [
      {
        type: "table",
        children: [
          {
            type: "td",
            children: [
              { type: "p", children: [{ text: "cell" }] },
              { type: "placeholder", placeholderId: "abc", children: [{ text: "" }] },
            ],
          },
        ],
      },
    ];

    expect(placeholderCount(withoutPendingUploads(value))).toBe(0);
  });

  it("never leaves an element with no children at all", () => {
    const value = [
      {
        type: "td",
        children: [{ type: "placeholder", placeholderId: "abc", children: [{ text: "" }] }],
      },
    ];

    expect(withoutPendingUploads(value)).toEqual([
      { type: "td", children: [{ text: "" }] },
    ]);
  });

  it("leaves a document with no pending upload exactly as it was", () => {
    const value = [
      { type: "p", children: [{ text: "unchanged" }] },
      { type: "img", url: "kb-media/org-1/photo.webp", children: [{ text: "" }] },
    ];

    expect(withoutPendingUploads(value)).toEqual(value);
  });

  it("passes a non-array value through rather than inventing a document", () => {
    expect(withoutPendingUploads(undefined)).toBeUndefined();
  });

  it("round-trips a bulleted, numbered and to-do list — including nesting — byte for byte", () => {
    const value = [
      { type: "p", listStyleType: "disc", indent: 1, children: [{ text: "first bullet" }] },
      { type: "p", listStyleType: "disc", indent: 2, children: [{ text: "nested bullet" }] },
      {
        type: "p",
        listStyleType: "decimal",
        indent: 1,
        listStart: 3,
        children: [{ text: "third numbered" }],
      },
      {
        type: "p",
        listStyleType: "todo",
        indent: 1,
        checked: true,
        children: [{ text: "done task" }],
      },
      {
        type: "p",
        listStyleType: "todo",
        indent: 2,
        checked: false,
        children: [{ text: "nested open task" }],
      },
    ];

    expect(withoutPendingUploads(value)).toEqual(value);
    expect(JSON.stringify(withoutPendingUploads(value))).toBe(JSON.stringify(value));
  });

  it("keeps every mark on a list item's text runs", () => {
    const value = [
      {
        type: "p",
        listStyleType: "disc",
        indent: 1,
        children: [
          { text: "bold ", bold: true },
          { text: "and code", code: true },
        ],
      },
    ];

    expect(JSON.stringify(withoutPendingUploads(value))).toBe(JSON.stringify(value));
  });
});

describe("withoutPendingUploads — an open slash, mention or emoji combobox is never persisted (KB-B-033)", () => {
  it("drops a slash_input left inside a paragraph and keeps the paragraph's text", () => {
    const value = [
      {
        type: "p",
        children: [
          { text: "before " },
          { type: "slash_input", children: [{ text: "" }] },
          { text: " after" },
        ],
      },
    ];

    expect(withoutPendingUploads(value)).toEqual([
      { type: "p", children: [{ text: "before " }, { text: " after" }] },
    ]);
  });

  it("drops mention_input and emoji_input but keeps a finished mention", () => {
    const value = [
      {
        type: "p",
        children: [
          { type: "mention_input", children: [{ text: "" }] },
          { type: "mention", value: "Ada", children: [{ text: "" }] },
          { type: "emoji_input", children: [{ text: "" }] },
        ],
      },
    ];

    expect(withoutPendingUploads(value)).toEqual([
      { type: "p", children: [{ type: "mention", value: "Ada", children: [{ text: "" }] }] },
    ]);
  });
});

describe("uploadEditorMedia — KB-B-006 the same file chosen twice while uploading", () => {
  function fakeEditor() {
    const inserted: Array<Record<string, unknown>> = [];
    const editor = {
      tf: {
        insertNodes: jest.fn((node: Record<string, unknown>) => inserted.push(node)),
        setNodes: jest.fn(),
        unsetNodes: jest.fn(),
        removeNodes: jest.fn(),
      },
      api: { node: jest.fn(() => [inserted[0], [0]]) },
    };
    return { editor, inserted };
  }

  it("inserts one placeholder and uploads once for a duplicate pick, then accepts the same file again once the first upload finished", async () => {
    const { editor, inserted } = fakeEditor();
    const file = new File(["x"], "valid-image.png", { type: "image/png", lastModified: 1 });
    let finish: (value: { key: string; name: string; size: number; mimeType: string }) => void = () => undefined;
    const uploadFile = jest.fn(() => new Promise<{ key: string; name: string; size: number; mimeType: string }>((resolve) => { finish = resolve; }));

    const first = uploadEditorMedia(editor as never, file, uploadFile);
    await uploadEditorMedia(editor as never, file, uploadFile);
    expect(inserted).toHaveLength(1);
    expect(uploadFile).toHaveBeenCalledTimes(1);

    finish({ key: "org/kb-media/a.png", name: "valid-image.png", size: 1, mimeType: "image/png" });
    await first;
    expect(editor.tf.setNodes).toHaveBeenCalledWith(expect.objectContaining({ url: "org/kb-media/a.png" }), { at: [0] });

    const again = uploadEditorMedia(editor as never, file, uploadFile);
    finish({ key: "org/kb-media/b.png", name: "valid-image.png", size: 1, mimeType: "image/png" });
    await again;
    expect(inserted).toHaveLength(2);
    expect(uploadFile).toHaveBeenCalledTimes(2);
  });
});
