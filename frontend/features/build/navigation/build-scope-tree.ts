const ORGANIZATION_PARENT = "Organization";
const PATH_SEPARATOR = " / ";

export function resolveLinkedProjectParentPath(
  productName: string | undefined,
  workspaceName: string | undefined,
): string {
  if (productName === undefined) return ORGANIZATION_PARENT;
  if (workspaceName === undefined) return productName;
  return `${workspaceName}${PATH_SEPARATOR}${productName}`;
}

export function detectsQuarantinedProduct(
  pmWorkspaceId: string | null,
  workspaceNames: ReadonlyMap<string, string>,
  hierarchyIsComplete: boolean,
): boolean {
  if (pmWorkspaceId === null) return false;
  if (!hierarchyIsComplete) return false;
  return !workspaceNames.has(pmWorkspaceId);
}

export function detectsQuarantinedProject(
  managedProductId: number | null,
  productNames: ReadonlyMap<number, string>,
  productWorkspaceIds: ReadonlyMap<number, string | null>,
  workspaceNames: ReadonlyMap<string, string>,
  hierarchyIsComplete: boolean,
): boolean {
  if (managedProductId === null) return false;
  if (!hierarchyIsComplete) return false;
  if (!productNames.has(managedProductId)) return true;
  const workspaceId = productWorkspaceIds.get(managedProductId) ?? null;
  if (workspaceId !== null && !workspaceNames.has(workspaceId)) return true;
  return false;
}
