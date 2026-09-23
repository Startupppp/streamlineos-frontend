/** Whether the caller holds the permission -- including "not known yet". */
export type AccessState = "loading" | "granted" | "denied";

/**
 * `useCan`'s answer, kept as three values rather than collapsed to two.
 *
 * Takes the access query's own loading flag rather than inferring it from the
 * absence of data, because "no data yet" and "data says no" are the two things
 * being told apart and inferring one from the other is how they were conflated.
 */
export function accessState(input: {
  readonly isLoading: boolean;
  readonly granted: boolean;
}): AccessState {
  if (input.isLoading) return "loading";
  return input.granted ? "granted" : "denied";
}
