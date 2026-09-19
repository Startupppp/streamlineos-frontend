import { z } from "zod";

const CONFIRM_ACTION_PREFIX = "CONFIRM_ACTION:";
const CONNECT_INTEGRATION_PREFIX = "CONNECT_INTEGRATION:";

const confirmActionDirectiveSchema = z.object({
  kind: z.literal("confirm-action"),
  proposalId: z.number(),
  token: z.string(),
  action: z.string(),
  summary: z.string(),
  preview: z.record(z.string(), z.unknown()),
});

const connectIntegrationDirectiveSchema = z.object({
  kind: z.literal("connect-integration"),
  toolkit: z.enum(["googlecalendar", "outlook", "gmail"]),
  reason: z.enum(["no-connection", "needs-reauth"]),
  summary: z.string(),
});

export const askOsDirectiveSchema = z.discriminatedUnion("kind", [
  confirmActionDirectiveSchema,
  connectIntegrationDirectiveSchema,
]);

export type AskOsDirective = z.infer<typeof askOsDirectiveSchema>;
export type ConfirmActionDirective = z.infer<typeof confirmActionDirectiveSchema>;
export type ConnectIntegrationDirective = z.infer<typeof connectIntegrationDirectiveSchema>;

const DIRECTIVE_PREFIXES: Array<{ prefix: string; kind: AskOsDirective["kind"] }> = [
  { prefix: CONFIRM_ACTION_PREFIX, kind: "confirm-action" },
  { prefix: CONNECT_INTEGRATION_PREFIX, kind: "connect-integration" },
];

export function parseAskOsDirective(content: string): AskOsDirective | null {
  for (const { prefix, kind } of DIRECTIVE_PREFIXES) {
    if (!content.startsWith(prefix)) continue;
    try {
      const raw: unknown = JSON.parse(content.slice(prefix.length).trim());
      if (typeof raw !== "object" || raw === null) return null;
      const result = askOsDirectiveSchema.safeParse(Object.assign({}, raw, { kind }));
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function serializeAskOsDirective(directive: AskOsDirective): string {
  switch (directive.kind) {
    case "confirm-action": {
      const { kind: _kind, ...body } = directive;
      return `${CONFIRM_ACTION_PREFIX}${JSON.stringify(body)}`;
    }
    case "connect-integration": {
      const { kind: _kind, ...body } = directive;
      return `${CONNECT_INTEGRATION_PREFIX}${JSON.stringify(body)}`;
    }
  }
}

export function extractAskOsDirective(content: string): {
  directive: AskOsDirective | null;
  prose: string;
} {
  const leading = parseAskOsDirective(content);
  if (leading !== null) return { directive: leading, prose: "" };

  const separator = content.lastIndexOf("\n");
  if (separator === -1) return { directive: null, prose: content };

  const tail = parseAskOsDirective(content.slice(separator + 1));
  if (tail === null) return { directive: null, prose: content };
  return { directive: tail, prose: content.slice(0, separator) };
}

export function appendAskOsDirective(
  content: string,
  directive: AskOsDirective | null,
): string {
  if (directive === null) return content;
  if (extractAskOsDirective(content).directive !== null) return content;
  const encoded = serializeAskOsDirective(directive);
  const trimmed = content.trimEnd();
  return trimmed.length === 0 ? encoded : `${trimmed}\n${encoded}`;
}

export function parseAskOsDirectivePayload(data: unknown): AskOsDirective | null {
  const result = askOsDirectiveSchema.safeParse(data);
  return result.success ? result.data : null;
}
