export interface HierarchyParentOption {
  value: string;
  label: string;
}

export function mergeHierarchyParentOptions(
  fetchedOptions: HierarchyParentOption[],
  selectedOption: HierarchyParentOption | null,
): HierarchyParentOption[] {
  const optionsByValue = new Map<string, HierarchyParentOption>();
  if (selectedOption) optionsByValue.set(selectedOption.value, selectedOption);
  for (const option of fetchedOptions)
    optionsByValue.set(option.value, option);
  return [...optionsByValue.values()];
}
