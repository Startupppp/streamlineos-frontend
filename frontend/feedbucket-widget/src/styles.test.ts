import { getStyles } from "./styles";

describe("feedbucket widget styles — pointer-events isolation", () => {
  it("widget container has pointer-events none so it does not intercept primary UI controls", () => {
    const css = getStyles();
    const widgetBlock = css.match(/\.widget\s*\{[^}]*\}/)?.[0] ?? "";
    expect(widgetBlock).toContain("pointer-events: none");
  });

  it("launcher pill restores pointer-events so buttons remain interactive", () => {
    const css = getStyles();
    const launcherBlock = css.match(/\.launcher\s*\{[^}]*\}/)?.[0] ?? "";
    expect(launcherBlock).toContain("pointer-events: auto");
  });

  it("panel restores pointer-events when open so feedback form receives events", () => {
    const css = getStyles();
    const openPanel = css.match(/\.panel\[aria-hidden="false"\]\s*\{[^}]*\}/)?.[0] ?? "";
    expect(openPanel).toContain("pointer-events: auto");
  });
});
