import { z } from "zod";

const CONFIRM_ACTION_PREFIX = "CONFIRM_ACTION:";
const CONNECT_INTEGRATION_PREFIX = "CONNECT_INTEGRATION:";

const confirmActionDirectiveSchema = z.object({
  kind: z.literal("confirm-action"),
  proposalId: z.number(),
  token: z.string(),
  action: z.string(),
  summary: z.string(),
  preview: z.record(z.unknown()),
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
