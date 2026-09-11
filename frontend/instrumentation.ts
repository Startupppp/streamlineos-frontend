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

export function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
    renderSource?: string;
  }
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? (err.stack ?? "") : "";
  const cause =
    err instanceof Error && err.cause instanceof Error
      ? `\n  cause: ${err.cause.message}\n  causeStack: ${err.cause.stack ?? ""}`
      : "";
  const digest =
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof err.digest === "string"
      ? `\n  digest: ${err.digest}`
      : "";
  console.error(
    `[onRequestError] ${context.routeType} ${request.method} ${request.path} → ${context.routePath}` +
      (context.renderSource ? ` (${context.renderSource})` : "") +
      `\n  message: ${message}${digest}${cause}\n  stack: ${stack}`,
  );
}
