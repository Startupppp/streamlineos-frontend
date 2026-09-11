/**
 * Add or remove one value from a selection list. Written out at every checkbox
 * group, the rule reads as `checked ? [...list, v] : list.filter(x => x !== v)`
 * — three copies of it disagreed on nothing, which is exactly why it belongs
 * in one place rather than in three inline closures.
 */
export function setListMembership<T>(
  list: readonly T[],
  value: T,
  member: boolean,
): T[] {
  if (member) return list.includes(value) ? [...list] : [...list, value];
  return list.filter((entry) => entry !== value);
}

export function toggleListMembership<T>(list: readonly T[], value: T): T[] {
  return setListMembership(list, value, !list.includes(value));
}
