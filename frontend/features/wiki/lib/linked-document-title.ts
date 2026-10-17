import type { LinkedDocumentStatus } from "@/hooks/api/kb/linked-documents";

export const REMOVED_DOCUMENT_TITLE = "Removed document";
export const HIDDEN_DOCUMENT_TITLE = "Details no longer shown";

export function linkedDocumentTitle(entry: { name: string | null; status: LinkedDocumentStatus }): string {
  if (entry.name !== null) return entry.name;
  return entry.status === "source_removed" ? REMOVED_DOCUMENT_TITLE : HIDDEN_DOCUMENT_TITLE;
}
