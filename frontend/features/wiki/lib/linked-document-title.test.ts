import { HIDDEN_DOCUMENT_TITLE, REMOVED_DOCUMENT_TITLE, linkedDocumentTitle } from "./linked-document-title";

describe("linkedDocumentTitle", () => {
  it("is the name whenever the server sent one", () => {
    expect(linkedDocumentTitle({ name: "Code of Conduct", status: "active" })).toBe("Code of Conduct");
    expect(linkedDocumentTitle({ name: "Old handbook", status: "unpublished" })).toBe("Old handbook");
  });

  it("says the document was removed when its source is gone", () => {
    expect(linkedDocumentTitle({ name: null, status: "source_removed" })).toBe(REMOVED_DOCUMENT_TITLE);
  });

  it("says the details are hidden, not that the document was removed, for a withdrawn entry with no name", () => {
    expect(linkedDocumentTitle({ name: null, status: "unpublished" })).toBe(HIDDEN_DOCUMENT_TITLE);
    expect(HIDDEN_DOCUMENT_TITLE).not.toBe(REMOVED_DOCUMENT_TITLE);
  });
});
