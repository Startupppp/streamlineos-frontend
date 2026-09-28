import type { OrderByOption } from "./types";

describe("OrderByOption", () => {
  it('includes "updated" so a deep-linked orderBy=updated survives typed as itself and is not coerced to the fallback', () => {
    const value: OrderByOption = "updated";
    expect(value).toBe("updated");
  });

  it('retains the pre-existing members so widening the union is additive', () => {
    const values: OrderByOption[] = ["created", "priority", "dueDate", "manual", "updated"];
    expect(values).toHaveLength(5);
  });
});
