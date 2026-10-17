import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FILTER_ROW_STACKS_ON_MOBILE } from "@/components/ui/content-fill-panel";

const PAGE = "features/recruitment/question-bank-page.tsx";

function source(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("HRMS-D-001 the question bank filter row stacks instead of clipping at 390px", () => {
  it("reaches the stacking rule through the shared constant", () => {
    expect(source(PAGE)).toContain("filtersClassName={FILTER_ROW_STACKS_ON_MOBILE}");
    expect(source(PAGE)).not.toContain('filtersClassName="max-md:');
  });

  it("stops nesting its own sideways-scrolling row inside the page wrapper's filter row", () => {
    expect(source(PAGE)).not.toContain("FILTER_TOOLBAR_ROW");
    expect(FILTER_ROW_STACKS_ON_MOBILE).toContain("max-md:overflow-x-visible");
  });

  it("still renders both filters, so the fix is not a removal", () => {
    const page = source(PAGE);

    expect(page).toContain("All Categories");
    expect(page).toContain("All Levels");
    expect(page).toContain("Search questions...");
  });
});
