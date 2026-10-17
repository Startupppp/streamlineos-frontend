import {
  citationSourceState,
  linkPreviewDisplayTitle,
  linkPreviewHasMeta,
} from "./plate-citation-link-model";

describe("citationSourceState", () => {
  it("reports no source and an Add-source label when neither field is set", () => {
    expect(citationSourceState(null, null)).toEqual({
      hasSource: false,
      buttonLabel: "Add source",
      display: null,
    });
  });

  it("prefers the title as the display value when both title and url are set", () => {
    expect(citationSourceState("Annual Report", "https://example.com/report")).toEqual({
      hasSource: true,
      buttonLabel: "Edit source",
      display: "Annual Report",
    });
  });

  it("falls back to the url as the display value when only the url is set", () => {
    expect(citationSourceState(null, "https://example.com/report")).toEqual({
      hasSource: true,
      buttonLabel: "Edit source",
      display: "https://example.com/report",
    });
  });

  it("treats a title-only source as having a source", () => {
    expect(citationSourceState("Internal memo", null)).toEqual({
      hasSource: true,
      buttonLabel: "Edit source",
      display: "Internal memo",
    });
  });
});

describe("linkPreviewDisplayTitle", () => {
  it("uses the fetched title when present", () => {
    expect(
      linkPreviewDisplayTitle(
        { title: "Example Site", description: null, image: null, siteName: null },
        "https://example.com",
      ),
    ).toBe("Example Site");
  });

  it("falls back to the raw url when no title was fetched", () => {
    expect(
      linkPreviewDisplayTitle(
        { title: null, description: null, image: null, siteName: null },
        "https://example.com",
      ),
    ).toBe("https://example.com");
  });

  it("falls back to the raw url when the metadata query has not resolved", () => {
    expect(linkPreviewDisplayTitle(undefined, "https://example.com")).toBe(
      "https://example.com",
    );
  });
});

describe("linkPreviewHasMeta", () => {
  it("is false when the metadata query has not resolved", () => {
    expect(linkPreviewHasMeta(undefined)).toBe(false);
  });

  it("is false when every field is empty", () => {
    expect(
      linkPreviewHasMeta({ title: null, description: null, image: null, siteName: null }),
    ).toBe(false);
  });

  it("is true when only a description was found", () => {
    expect(
      linkPreviewHasMeta({
        title: null,
        description: "A page about examples",
        image: null,
        siteName: null,
      }),
    ).toBe(true);
  });

  it("is true when only an image was found", () => {
    expect(
      linkPreviewHasMeta({
        title: null,
        description: null,
        image: "https://example.com/og.png",
        siteName: null,
      }),
    ).toBe(true);
  });
});
