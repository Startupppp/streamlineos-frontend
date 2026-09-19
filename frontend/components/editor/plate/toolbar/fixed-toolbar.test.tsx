import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("wiki document format toolbar scroll chrome", () => {
  it("does not offset the format bar by the app header inside the wiki scroller", () => {
    const toolbar = readFileSync(join(__dirname, "fixed-toolbar.tsx"), "utf8");
    expect(toolbar).not.toContain("top-14");
    expect(toolbar).not.toContain("sticky");

    const editor = readFileSync(
      join(__dirname, "../plate-document-editor.tsx"),
      "utf8",
    );
    expect(editor).toContain("createPortal");
    expect(editor).toContain("toolbarHost");
    expect(editor).not.toContain("top-14");
  });
});
