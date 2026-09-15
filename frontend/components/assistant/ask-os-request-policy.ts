export type PersonaId =
  | "support"
  | "sales"
  | "hr-policy"
  | "project"
  | "operations";

const MAX_CONTEXT_MESSAGES = 20;
const MAX_CONTEXT_CHARS = 24_000;

const PATH_PERSONAS: ReadonlyArray<readonly [string, PersonaId]> = [
  ["/support", "support"],
  ["/crm", "sales"],
  ["/build", "project"],
  ["/inventory", "operations"],
  ["/accounting", "operations"],
  ["/purchases", "operations"],
  ["/hr", "hr-policy"],
  ["/payroll", "hr-policy"],
  ["/timesheets", "hr-policy"],
  ["/directory", "hr-policy"],
];

export function personaForPathname(pathname: string): PersonaId | null {
  return (
    PATH_PERSONAS.find(
      ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )?.[1] ?? null
  );
}

export function boundedAskOsContext<T extends { content: string }>(
  messages: readonly T[],
): T[] {
  const selected: T[] = [];
  let remaining = MAX_CONTEXT_CHARS;

  for (
    let index = messages.length - 1;
    index >= 0 && selected.length < MAX_CONTEXT_MESSAGES;
    index -= 1
  ) {
    const message = messages[index];
    if (!message || remaining === 0) break;
    const content = message.content.slice(0, remaining);
    remaining -= content.length;
    selected.push(content === message.content ? message : { ...message, content });
  }

  return selected.reverse();
}
