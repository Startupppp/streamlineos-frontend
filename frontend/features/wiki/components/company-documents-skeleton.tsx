import { WikiFillTable } from "./wiki-collection-skeletons";

const COMPANY_DOCUMENT_HEADERS = ["Name", "Category", "Effective from", "Version", "Added"] as const;

export function CompanyDocumentsSkeleton() {
  return <WikiFillTable headers={COMPANY_DOCUMENT_HEADERS} />;
}
