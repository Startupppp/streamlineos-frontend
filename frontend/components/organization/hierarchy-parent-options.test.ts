import { mergeHierarchyParentOptions } from "./hierarchy-parent-options";

describe("mergeHierarchyParentOptions", () => {
  it("keeps the selected parent when it is outside the current cursor page", () => {
    const selectedOption = {
      value: "business-unit-selected",
      label: "Selected Business Unit",
    };

    expect(
      mergeHierarchyParentOptions(
        [{ value: "business-unit-page", label: "Paged Business Unit" }],
        selectedOption,
      ),
    ).toEqual([
      selectedOption,
      { value: "business-unit-page", label: "Paged Business Unit" },
    ]);
  });

  it("deduplicates a selected parent returned by server search", () => {
    expect(
      mergeHierarchyParentOptions(
        [{ value: "branch-selected", label: "Current Branch Name" }],
        { value: "branch-selected", label: "Previous Branch Name" },
      ),
    ).toEqual([
      { value: "branch-selected", label: "Current Branch Name" },
    ]);
  });
});
