type HierarchyParentOption = {
  status: string;
  deletedAt?: string | null;
};

/** Only active, non-retired units can receive new child assignments. */
export function isAssignableHierarchyParent(
  option: HierarchyParentOption,
): boolean {
  return option.status === "ACTIVE" && !option.deletedAt;
}
