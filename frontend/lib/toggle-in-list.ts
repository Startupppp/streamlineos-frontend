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
