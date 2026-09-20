import { z } from "zod";

const CONFIRM_ACTION_PREFIX = "CONFIRM_ACTION:";
const CONNECT_INTEGRATION_PREFIX = "CONNECT_INTEGRATION:";

const confirmActionDirectiveSchema = z.object({
  kind: z.literal("confirm-action"),
  proposalId: z.number(),
  token: z.string().optional(),
  action: z.string(),
  summary: z.string(),
  preview: z.record(z.string(), z.unknown()),
  expiresAt: z.string().optional(),
  title: z.string().optional(),
  confirmLabel: z.string().optional(),
});

const liveConfirmActionDirectiveSchema = confirmActionDirectiveSchema.extend({
  token: z.string().min(1),
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

const liveAskOsDirectiveSchema = z.discriminatedUnion("kind", [
  liveConfirmActionDirectiveSchema,
  connectIntegrationDirectiveSchema,
]);

export type AskOsDirective = z.infer<typeof askOsDirectiveSchema>;
export type LiveAskOsDirective = z.infer<typeof liveAskOsDirectiveSchema>;
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
  directives: AskOsDirective[];
  prose: string;
} {
  const lines = content.trimEnd().split("\n");
  const directives: AskOsDirective[] = [];
  let proseEnd = lines.length;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] ?? "";
    if (line === "") continue;
    const d = parseAskOsDirective(line);
    if (d === null) break;
    directives.unshift(d);
    proseEnd = i;
  }

  const prose = lines.slice(0, proseEnd).join("\n");
  return { directives, prose };
}

export function appendAskOsDirective(
  content: string,
  directives: AskOsDirective[],
): string {
  if (directives.length === 0) return content;
  const { directives: existing } = extractAskOsDirective(content);
  if (existing.length > 0) return content;
  const encoded = directives.map(serializeAskOsDirective).join("\n");
  const trimmed = content.trimEnd();
  return trimmed.length === 0 ? encoded : `${trimmed}\n${encoded}`;
}

export function parseAskOsDirectivePayload(data: unknown): LiveAskOsDirective | null {
  const result = liveAskOsDirectiveSchema.safeParse(data);
  return result.success ? result.data : null;
}
