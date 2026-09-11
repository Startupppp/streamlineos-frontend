import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readFrontendSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("HR document type data-layer invariants", () => {
  it("keeps list and mutation requests in the canonical API hook", () => {
    const pageSource = readFrontendSource(
      "features/hr/document-types/document-types-page.tsx",
    );
    const hookSource = readFrontendSource("hooks/api/hr/document-types.ts");

    expect(pageSource).not.toContain("useQuery(");
    expect(pageSource).not.toContain("useMutation(");
    expect(pageSource).not.toContain("apiClient.");
    expect(pageSource).toContain("useHrDocumentTypesPage(pager.cursor, limit)");
    expect(hookSource).toContain('"/hr/document-types"');
  });

  it("uses the backend document capability and descriptive mutation identifier", () => {
    const pageSource = readFrontendSource(
      "features/hr/document-types/document-types-page.tsx",
    );
    const hookSource = readFrontendSource("hooks/api/hr/document-types.ts");

    expect(pageSource).toContain('useCan("hr:documents:manage")');
    expect(pageSource).not.toContain('useCan("hr:employees:manage")');
    expect(hookSource).toContain("documentTypeId: number");
    expect(hookSource).not.toContain("{ id: number }");
  });
});
