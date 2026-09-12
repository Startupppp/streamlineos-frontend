import { HEADER_ICON_LINKS } from "./global-header";
import { isUniversalRoute } from "@/lib/rbac/route-access/universal-routes";

describe("global header icon rail", () => {
  it("renders a bounded, non-empty set of destinations", () => {
    expect(HEADER_ICON_LINKS.length).toBeGreaterThan(0);
    expect(HEADER_ICON_LINKS.map((link) => link.href).sort()).toEqual([
      "/calendar",
      "/chat",
    ]);
  });

  it("only links destinations every active member keeps", () => {
    const gated = HEADER_ICON_LINKS.filter(
      (link) => !isUniversalRoute(link.href),
    )
      .map((link) => `${link.href}  (${link.label})`)
      .sort();
    expect(gated).toEqual([]);
  });

  it("labels every icon-only link", () => {
    const unlabelled = HEADER_ICON_LINKS.filter(
      (link) => link.label.trim().length === 0,
    ).map((link) => link.href);
    expect(unlabelled).toEqual([]);
  });
});
