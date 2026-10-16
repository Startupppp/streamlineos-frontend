import { markdownImportItem } from "./markdown-import-title";

describe("KB-B-019 markdownImportItem", () => {
  it("takes the front-matter title and drops the front-matter", () => {
    expect(markdownImportItem('---\ntitle: "Onboarding"\ntags: a\n---\n# Heading\nBody', "file.md")).toEqual({
      title: "Onboarding",
      contentText: "# Heading\nBody",
    });
  });

  it("takes an opening H1 as the title and removes it from the body", () => {
    expect(markdownImportItem("\n# Release notes\n\nBody text", "notes.md")).toEqual({
      title: "Release notes",
      contentText: "\nBody text",
    });
  });

  it("uses a later H1 as the title but keeps it in the body", () => {
    expect(markdownImportItem("Intro\n# Main\nMore", "a.md")).toEqual({ title: "Main", contentText: "Intro\n# Main\nMore" });
  });

  it("falls back to the file name", () => {
    expect(markdownImportItem("## Only h2\ntext", "my-doc.markdown")).toEqual({ title: "my-doc", contentText: "## Only h2\ntext" });
  });
});
