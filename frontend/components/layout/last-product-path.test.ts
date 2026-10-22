import {
  buildProductLocation,
  parseLastProductPaths,
  resolveRememberedProductHref,
  shouldRememberProductPath,
  writeLastProductPath,
  readLastProductPaths,
} from "./last-product-path";

describe("last-product-path", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("builds pathname + query without a double ?", () => {
    expect(buildProductLocation("/calendar", "view=week")).toBe(
      "/calendar?view=week",
    );
    expect(buildProductLocation("/calendar", "?view=week")).toBe(
      "/calendar?view=week",
    );
    expect(buildProductLocation("/calendar", "")).toBe("/calendar");
  });

  it("skips auth and denial routes", () => {
    expect(shouldRememberProductPath("/calendar")).toBe(true);
    expect(shouldRememberProductPath("/access-denied")).toBe(false);
    expect(shouldRememberProductPath("/org-setup")).toBe(false);
    expect(shouldRememberProductPath("/")).toBe(false);
  });

  it("parses only relative app paths", () => {
    expect(
      parseLastProductPaths({
        home: "/calendar?view=week",
        hrms: "https://evil.example/hr",
        build: "//evil.example",
        crm: 12,
      }),
    ).toEqual({ home: "/calendar?view=week" });
  });

  it("writes and reads org-scoped last paths", () => {
    writeLastProductPath("org-a::last-product-paths", "home", "/calendar?view=week");
    writeLastProductPath(
      "org-a::last-product-paths",
      "hrms",
      "/hr/document-types",
    );
    expect(readLastProductPaths("org-a::last-product-paths")).toEqual({
      home: "/calendar?view=week",
      hrms: "/hr/document-types",
    });
    expect(readLastProductPaths("org-b::last-product-paths")).toEqual({});
  });

  it("restores a remembered path only when it still belongs to that product", () => {
    expect(
      resolveRememberedProductHref(
        "home",
        "/calendar?view=week",
        "/dashboard",
      ),
    ).toBe("/calendar?view=week");

    expect(
      resolveRememberedProductHref(
        "home",
        "/hr/document-types",
        "/dashboard",
      ),
    ).toBe("/dashboard");

    expect(
      resolveRememberedProductHref("hrms", undefined, "/hr"),
    ).toBe("/hr");
  });
});
