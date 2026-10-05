import type { SubmissionRow } from "./product-feedback-columns";

export function resolveProductFeedbackSubmissionHref(
  row: SubmissionRow,
  managedProductId: number,
  canOpenDetail: boolean,
): string | null {
  const projectId = row.widget?.projectId;
  const owningManagedProductId = row.widget?.managedProductId;
  if (
    !canOpenDetail ||
    !Number.isSafeInteger(row.id) ||
    row.id <= 0 ||
    !Number.isSafeInteger(projectId) ||
    (projectId ?? 0) <= 0 ||
    owningManagedProductId !== managedProductId
  ) {
    return null;
  }
  return `/build/${projectId}/feedbucket/${row.id}`;
}
