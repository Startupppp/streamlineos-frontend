export async function register() {
  if (process.env.NODE_ENV !== "development") return;
  const orig = globalThis.setTimeout;
  // Patching a platform global: setTimeout is an overload set (Node's Timeout return
  // and the DOM's number) that no single function expression satisfies. The cast names
  // that one seam instead of a @ts-expect-error, which would blanket every error on the
  // statement; the prototype is restored below so `orig`'s statics survive.
  globalThis.setTimeout = function patchedSetTimeout(
    callback: (...args: unknown[]) => void,
    ms?: number,
    ...args: unknown[]
  ) {
    return orig(callback, typeof ms === "number" && ms < 0 ? 0 : ms, ...args);
  } as unknown as typeof globalThis.setTimeout;
  Object.setPrototypeOf(globalThis.setTimeout, orig);
}
