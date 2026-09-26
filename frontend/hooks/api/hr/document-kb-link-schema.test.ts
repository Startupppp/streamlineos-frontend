import { documentKbLinkStateContract } from "./document-kb-link-schema";

const baseState = {
  documentId: 7,
  link: null,
  publishable: true,
  documentAudiences: [],
};

describe("documentKbLinkStateContract — blocker resilience", () => {
  it("METADATA_HOLDS_PERSONAL_IDENTIFIER decodes to its code and message so the panel can render the human reason", () => {
    const raw = {
      ...baseState,
      blockers: [
        {
          code: "METADATA_HOLDS_PERSONAL_IDENTIFIER",
          message: "The document's searchable details hold a personal identifier. Remove it before sharing.",
        },
      ],
    };

    const result = documentKbLinkStateContract.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      const [first] = result.data.blockers;
      expect(first).toBeDefined();
      expect(first?.code).toBe("METADATA_HOLDS_PERSONAL_IDENTIFIER");
      expect(first?.known).toBe(true);
      expect(first?.message).toBe(
        "The document's searchable details hold a personal identifier. Remove it before sharing.",
      );
    }
  });

  it("a blocker with a code the frontend has never seen still renders its message rather than being dropped — not crashing was never the bar, not losing the reason is", () => {
    const raw = {
      ...baseState,
      blockers: [
        {
          code: "UNKNOWN_FUTURE_BLOCKER_CODE",
          message: "A newer backend version has detected a new kind of block.",
        },
      ],
    };

    const result = documentKbLinkStateContract.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blockers).toHaveLength(1);
      const [first] = result.data.blockers;
      expect(first?.message).toBe("A newer backend version has detected a new kind of block.");
      expect(first?.known).toBe(false);
      expect(first?.code).toBe("UNKNOWN_FUTURE_BLOCKER_CODE");
    }
  });

  it("a response with mixed known and unknown codes keeps all of them, distinguishing known from unknown so the UI can branch on what it understands", () => {
    const raw = {
      ...baseState,
      blockers: [
        { code: "DOCUMENT_INACTIVE", message: "The document has been removed." },
        { code: "FUTURE_BLOCKER_FROM_NEWER_API", message: "A future constraint." },
        { code: "METADATA_HOLDS_PERSONAL_IDENTIFIER", message: "PII in metadata." },
      ],
    };

    const result = documentKbLinkStateContract.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blockers).toHaveLength(3);
      expect(result.data.blockers[0]?.known).toBe(true);
      expect(result.data.blockers[1]?.known).toBe(false);
      expect(result.data.blockers[2]?.known).toBe(true);
      expect(result.data.blockers[1]?.message).toBe("A future constraint.");
    }
  });

  it("all six known blocker codes decode with known:true", () => {
    const raw = {
      ...baseState,
      blockers: [
        { code: "CLASSIFICATION_NOT_SHAREABLE", message: "Not shareable." },
        { code: "BELONGS_TO_AN_EMPLOYEE", message: "Belongs to an employee." },
        { code: "TYPE_NOT_ALLOWED", message: "Type not allowed." },
        { code: "DOCUMENT_INACTIVE", message: "Inactive." },
        { code: "HIRING_ARTEFACT", message: "Hiring artefact." },
        { code: "METADATA_HOLDS_PERSONAL_IDENTIFIER", message: "PII in metadata." },
      ],
    };

    const result = documentKbLinkStateContract.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blockers).toHaveLength(6);
      expect(result.data.blockers.every((b) => b.known)).toBe(true);
    }
  });
});
