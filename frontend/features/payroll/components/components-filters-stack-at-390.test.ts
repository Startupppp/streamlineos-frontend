import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FILTER_ROW_STACKS_ON_MOBILE } from "@/components/ui/content-fill-panel";

const ROOT = process.cwd();

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

const COMPONENTS_PAGE = "features/payroll/components/components-page.tsx";

const PAGES_THAT_STACK: readonly string[] = [
  COMPONENTS_PAGE,
  "features/payroll/employees/employees-list-page.tsx",
  "features/hr/employees/employees-list-page.tsx",
];

describe("BUG-004 the component catalog filter row stacks instead of clipping at 390px", () => {
  it("neutralises the base row's search-input basis, which is what pins the selects off-screen", () => {
    expect(FILTER_ROW_STACKS_ON_MOBILE).toContain("max-md:flex-col");
    expect(FILTER_ROW_STACKS_ON_MOBILE).toContain(
      "max-md:[&>[data-slot=search-input]]:basis-auto",
    );
    expect(FILTER_ROW_STACKS_ON_MOBILE).toContain(
      "max-md:[&>*:not([data-slot=search-input])]:w-full",
    );
  });

  it("stops the sideways scroll below md, so no filter is reachable only by dragging", () => {
    expect(FILTER_ROW_STACKS_ON_MOBILE).toContain("max-md:overflow-x-visible");
  });

  it("applies above md only, so the desktop row is unchanged", () => {
    const unprefixed = FILTER_ROW_STACKS_ON_MOBILE.split(" ").filter(
      (token) => !token.startsWith("max-md:"),
    );

    expect(unprefixed).toEqual([]);
  });

  it("is passed by the component catalog, the page BUG-004 was filed against", () => {
    expect(source(COMPONENTS_PAGE)).toContain(
      "filtersClassName={FILTER_ROW_STACKS_ON_MOBILE}",
    );
  });

  it.each(PAGES_THAT_STACK)(
    "%s reaches the stacking rule through the shared constant, so the three cannot drift apart",
    (page) => {
      expect(source(page)).toContain("filtersClassName={FILTER_ROW_STACKS_ON_MOBILE}");
      expect(source(page)).not.toContain('filtersClassName="max-md:');
    },
  );

  it("still renders the three filters the sweep found clipped, so the fix is not a removal", () => {
    const page = source(COMPONENTS_PAGE);

    expect(page).toContain("Search components…");
    expect(page).toContain("All types");
    expect(page).toContain("All status");
  });
});
