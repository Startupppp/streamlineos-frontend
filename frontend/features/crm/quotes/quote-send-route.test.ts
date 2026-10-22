import { readFileSync } from "node:fs";
import { join } from "node:path";

const FRONTEND_ROOT = join(__dirname, "..", "..", "..");

function read(relative: string): string {
  return readFileSync(join(FRONTEND_ROOT, relative), "utf8");
}

describe("every quote send call site uses the dedicated endpoint", () => {
  const CALL_SITES = [
    "app/(authenticated)/crm/quotes/[quoteId]/page.tsx",
    "app/(authenticated)/crm/quotes/page.tsx",
    "features/crm/deals/deal-quotes-section.tsx",
  ];

  it.each(CALL_SITES)("%s calls useSendQuote", (file) => {
    expect(read(file)).toContain("useSendQuote");
  });

  it.each(CALL_SITES)("%s never patches a quote to SENT", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/\{\s*id[^}]*status:\s*"SENT"/);
    expect(source).not.toMatch(/changeStatus\(\s*"SENT"\s*\)/);
  });

  it("the list page routes a SENT transition to the send mutation, not the patch", () => {
    const source = read("app/(authenticated)/crm/quotes/page.tsx");
    expect(source).toMatch(/if\s*\(\s*status === "SENT"\s*\)/);
    expect(source).toMatch(/sendQuote\.mutate\(/);
  });

  it("points the hook at the lifecycle route, not the generic update", () => {
    const hook = read("hooks/api/crm/quotes.ts");
    expect(hook).toContain("useSendQuote");
    expect(hook).toMatch(/apiClient\.post<Quote>\(`\/quotes\/\$\{id\}\/send`\)/);
  });

  it("leaves accept and reject on the generic update, which is correct", () => {
    const detail = read("app/(authenticated)/crm/quotes/[quoteId]/page.tsx");
    expect(detail).toMatch(/status:\s*"ACCEPTED"/);
    expect(detail).toMatch(/status:\s*"REJECTED"/);
  });
});
