export function rollbackOptimisticFields<T extends object>(
  current: T,
  previous: T,
  optimistic: T,
): T {
  const restored = { ...current };
  for (const field in optimistic)
    if (
      !Object.is(previous[field], optimistic[field]) &&
      Object.is(current[field], optimistic[field])
    )
      restored[field] = previous[field];
  return restored;
}
