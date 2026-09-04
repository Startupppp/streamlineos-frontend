/**
 * Radix `Select.Item` throws on an empty `value`, and `SelectContent` mounts
 * its children even while closed — so `<SelectItem value="">` white-screens the
 * page. Optional accounting filters use this sentinel for "no selection" and
 * translate it back to empty/undefined at the boundary.
 */
export const SELECT_NONE_VALUE = "__none__";
