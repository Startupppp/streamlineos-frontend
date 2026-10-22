export type AccessState = "loading" | "granted" | "denied";

export function accessState(input: {
  readonly isLoading: boolean;
  readonly granted: boolean;
}): AccessState {
  if (input.isLoading) return "loading";
  return input.granted ? "granted" : "denied";
}
