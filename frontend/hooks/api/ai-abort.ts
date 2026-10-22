export interface AiAbortInput {
  signal?: AbortSignal;
}

export type AiAbortableScalar<T extends string | number> = T | ({ value: T } & AiAbortInput);

export function readAiAbortableScalar<T extends string | number>(
  input: AiAbortableScalar<T>,
): { value: T; signal?: AbortSignal } {
  if (typeof input === "object") return { value: input.value, signal: input.signal };
  return { value: input };
}
