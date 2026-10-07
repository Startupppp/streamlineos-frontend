import { getStyles } from "./styles";

describe("feedbucket widget styles — pointer-events isolation", () => {
  it("contains its overlays below application modals in a positioned host", () => {
    const stylesheet = new CSSStyleSheet();
    stylesheet.insertRule(getStyles().match(/:host\s*\{[^}]*\}/)?.[0] ?? ":host {}");
    const hostRule = stylesheet.cssRules[0];
    expect(hostRule).toBeInstanceOf(CSSStyleRule);
    if (!(hostRule instanceof CSSStyleRule)) throw new Error("Missing host style rule");
    expect(hostRule.style.getPropertyValue("position")).toBe("relative");
    expect(Number(hostRule.style.getPropertyValue("z-index"))).toBeGreaterThan(0);
    expect(Number(hostRule.style.getPropertyValue("z-index"))).toBeLessThan(50);
  });

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

  it("keeps feedback actions hidden until the compact launcher is expanded", () => {
    const css = getStyles();
    expect(css).toContain(".launcher:not(:hover):not(:focus-within):not(.expanded) .launcher-btn");
    expect(css).toContain(".launcher:not(:focus-within):not(.expanded) .launcher-btn");
  });

  it("keeps the desktop launcher compact before the feedback marker is added", () => {
    const css = getStyles();
    const launcher = css.match(/\.launcher\s*\{[^}]*\}/)?.[0] ?? "";
    const logo = css.match(/\.launcher-logo\s*\{[^}]*\}/)?.[0] ?? "";
    expect(launcher).toContain("padding: 4px");
    expect(logo).toContain("width: 32px");
    expect(logo).toContain("height: 32px");
  });

  it("panel restores pointer-events when open so feedback form receives events", () => {
    const css = getStyles();
    const openPanel = css.match(/\.panel\[aria-hidden="false"\]\s*\{[^}]*\}/)?.[0] ?? "";
    expect(openPanel).toContain("pointer-events: auto");
  });
});

describe("feedbucket widget styles — narrow-viewport docking (SETTINGS-012)", () => {
  it("docks the undragged launcher bottom-left and lays it flat below 1024px", () => {
    const css = getStyles();
    const block = css.match(/@media \(max-width: 1023px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(block).toContain(".widget:not(.positioned)");
    expect(block).toContain("right: auto");
    expect(block).toContain("left: 12px");
    expect(block).toContain("flex-direction: row");
  });

  it("leaves a dragged launcher where the reader put it", () => {
    const css = getStyles();
    const block = css.match(/@media \(max-width: 1023px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(block).not.toMatch(/\.widget\s*\{/);
  });

  it("keeps the compact launcher smaller on phone widths", () => {
    const css = getStyles();
    const block = css.match(/@media \(max-width: 480px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(block).toContain(".launcher { padding: 4px; }");
    expect(block).toContain(".launcher-logo, .launcher-btn { width: 34px; height: 34px; }");
  });
});
