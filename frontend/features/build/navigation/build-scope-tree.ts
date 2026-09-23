export function resolveLinkedProjectParentPath(
  productName: string | undefined,
): string | null {
  return productName ?? null;
}

export function detectsQuarantinedProject(
  managedProductId: number | null,
  productNames: ReadonlyMap<number, string>,
  hierarchyIsComplete: boolean,
): boolean {
  if (managedProductId === null) return false;
  if (!hierarchyIsComplete) return false;
  return !productNames.has(managedProductId);
}
