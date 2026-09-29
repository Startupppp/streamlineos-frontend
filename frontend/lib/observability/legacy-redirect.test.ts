/**
 * @jest-environment node
 */
import {
  legacyRedirectHits,
  observedLegacyRedirectSources,
  recordLegacyRedirect,
  resetLegacyRedirectCounts,
} from "./legacy-redirect";

describe("recordLegacyRedirect", () => {
  let logged: string[];
  let origInfo: typeof console.info;

  beforeEach(() => {
    resetLegacyRedirectCounts();
    logged = [];
    origInfo = console.info;
    console.info = (...args: unknown[]): void => {
      const first = args.at(0);
      if (typeof first === "string") logged.push(first);
    };
  });

  afterEach(() => {
    console.info = origInfo;
    resetLegacyRedirectCounts();
  });

  it("starts at zero hits for an unseen source", () => {
    expect(legacyRedirectHits("/projects")).toBe(0);
    expect(observedLegacyRedirectSources()).toEqual([]);
  });

  it("counts one hit per call and returns the running total", () => {
    expect(recordLegacyRedirect("/projects", "/build/1")).toBe(1);
    expect(recordLegacyRedirect("/projects", "/build/2")).toBe(2);
    expect(legacyRedirectHits("/projects")).toBe(2);
  });

  it("counts each legacy source separately", () => {
    recordLegacyRedirect("/projects", "/build");
    recordLegacyRedirect("/product-management", "/build");
    recordLegacyRedirect("/product-management", "/build/3");
    expect(legacyRedirectHits("/projects")).toBe(1);
    expect(legacyRedirectHits("/product-management")).toBe(2);
    expect(observedLegacyRedirectSources()).toEqual([
      "/product-management",
      "/projects",
    ]);
  });

  it("emits one parseable log line naming the source, destination and hit count", () => {
    recordLegacyRedirect("/projects", "/build/7/issues");
    expect(logged).toHaveLength(1);
    expect(JSON.parse(logged[0] as string)).toEqual({
      event: "legacy_redirect",
      source: "/projects",
      destination: "/build/7/issues",
      hits: 1,
    });
  });
});
