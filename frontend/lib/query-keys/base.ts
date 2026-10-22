export const queryKeyBase = ["streamlineos"] as const;

export function trimKey(...parts: readonly unknown[]): readonly unknown[] {
  let end = parts.length;
  while (end > 0 && parts[end - 1] === undefined) end -= 1;
  return parts.slice(0, end);
}

type NoAbortSignal = {
  readonly aborted?: never;
  readonly addEventListener?: never;
  readonly throwIfAborted?: never;
};

export type QueryKeyParams =
  | ({ readonly [key: string]: unknown } & NoAbortSignal)
  | (object & NoAbortSignal);
