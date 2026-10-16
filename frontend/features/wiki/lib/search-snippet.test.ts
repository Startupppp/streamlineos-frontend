import { parseSearchSnippet, searchSnippetPlainText } from "./search-snippet";

describe("parseSearchSnippet — ts_headline <b> marks become readable text", () => {
  it("does not keep highlight tags in the plain-text subtitle", () => {
    const snippet = "<b>Sign</b>, Adobe <b>Sign</b>), <b>SignOS</b> is embedded";
    expect(searchSnippetPlainText(snippet)).toBe("Sign, Adobe Sign), SignOS is embedded");
  });

  it("keeps match spans so the row can emphasize them", () => {
    expect(parseSearchSnippet("<b>Sign</b>OS is embedded")).toEqual([
      { text: "Sign", highlight: true },
      { text: "OS is embedded", highlight: false },
    ]);
  });

  it("treats a snippet with no marks as a single plain run", () => {
    expect(parseSearchSnippet("No highlights here")).toEqual([
      { text: "No highlights here", highlight: false },
    ]);
  });

  it("drops a dangling mark tag instead of showing it", () => {
    expect(searchSnippetPlainText("Adobe <b>Sign")).toBe("Adobe Sign");
  });

  it("keeps literal angle-bracket text from the page, because only the <b> marks are markup", () => {
    expect(searchSnippetPlainText("if a < b and c > d then <b>swap</b>")).toBe("if a < b and c > d then swap");
    expect(parseSearchSnippet("use <T> generics with <b>Map</b>")).toEqual([
      { text: "use <T> generics with ", highlight: false },
      { text: "Map", highlight: true },
    ]);
  });
});
