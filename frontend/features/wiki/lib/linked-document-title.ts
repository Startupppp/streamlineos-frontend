import type { LinkedDocumentStatus } from "@/hooks/api/kb/linked-documents";

export const REMOVED_DOCUMENT_TITLE = "Removed document";
export const HIDDEN_DOCUMENT_TITLE = "Details no longer shown";

/**
 * What to call an entry that has no name. The server sends a name only while the HR document can still be shared:
 * an entry whose document was removed has none, and neither does one whose document has since become personal,
 * confidential or an employee's (the server withholds every detail of it, even from the person who manages the entry).
 */
export function linkedDocumentTitle(entry: { name: string | null; status: LinkedDocumentStatus }): string {
  if (entry.name !== null) return entry.name;
  return entry.status === "source_removed" ? REMOVED_DOCUMENT_TITLE : HIDDEN_DOCUMENT_TITLE;
}
