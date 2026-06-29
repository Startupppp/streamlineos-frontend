export async function register() {
  if (process.env.NODE_ENV !== "development") return;
  const orig = globalThis.setTimeout;
  // @ts-expect-error — generic overloads on globalThis.setTimeout can't be matched without a cast
  globalThis.setTimeout = function patchedSetTimeout(
    callback: (...args: unknown[]) => void,
    ms?: number,
    ...args: unknown[]
  ) {
    return orig(callback, typeof ms === "number" && ms < 0 ? 0 : ms, ...args);
  };
  Object.setPrototypeOf(globalThis.setTimeout, orig);
}
