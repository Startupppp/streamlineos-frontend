import { ORDER_OPTIONS } from "./display-prefs-popover";

describe("the project list Order-by menu", () => {
  it("never offers Created, because ProjectListItem carries no createdAt field for sortProjects to compare", () => {
    const values = ORDER_OPTIONS.map((option) => option.value);
    expect(values).not.toContain("createdAt");
  });
});
