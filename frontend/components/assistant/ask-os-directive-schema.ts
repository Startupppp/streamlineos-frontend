import { z } from "zod";

function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//");
  return /^https?:\/\//i.test(href);
}

const safeHrefSchema = z.string().refine(isSafeHref).optional().catch(undefined);

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

const clarifyDirectiveSchema = z.object({
  kind: z.literal("clarify"),
  clarificationId: z.string().min(1),
  purpose: z.enum(["scope", "entity", "time", "connection", "other"]),
  question: z.string(),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string(),
        description: z.string().optional(),
      }),
    )
    .min(1),
  expiresAt: z.string(),
});

const evidenceDirectiveSchema = z.object({
  kind: z.literal("evidence"),
  sources: z.array(
    z.object({
      owner: z.string(),
      label: z.string(),
      status: z.enum([
        "ok",
        "empty",
        "partial",
        "degraded",
        "denied",
        "needs-connection",
        "failed",
      ]),
      asOf: z.string().optional(),
      scope: z.string().optional(),
      href: safeHrefSchema,
      citationId: z.string().optional(),
      excerpt: z.string().optional(),
    }),
  ),
});

const actionPlanDirectiveSchema = z.object({
  kind: z.literal("action-plan"),
  steps: z.array(
    z.object({
      index: z.number(),
      title: z.string(),
      action: z.string().optional(),
      status: z.enum(["pending", "proposed", "completed", "failed", "declined"]),
    }),
  ),
});

const capabilityLimitDirectiveSchema = z.object({
  kind: z.literal("capability-limit"),
  reason: z.enum([
    "unsupported",
    "denied",
    "module-disabled",
    "needs-connection",
    "companion-blocked",
  ]),
  summary: z.string(),
  href: safeHrefSchema,
});

export const askOsActionReceiptSchema = z.object({
  proposalId: z.number(),
  action: z.string(),
  status: z.enum([
    "committed",
    "failed",
    "conflicted",
    "expired",
    "denied",
    "already-completed",
  ]),
  summary: z.string(),
  resultId: z.string().optional(),
  href: safeHrefSchema,
  changedFields: z.array(z.string()).optional(),
  at: z.string(),
});

const actionReceiptDirectiveSchema = askOsActionReceiptSchema.extend({
  kind: z.literal("action-receipt"),
});

const sharedDirectiveSchemas = [
  connectIntegrationDirectiveSchema,
  clarifyDirectiveSchema,
  evidenceDirectiveSchema,
  actionPlanDirectiveSchema,
  capabilityLimitDirectiveSchema,
  actionReceiptDirectiveSchema,
] as const;

export const askOsDirectiveSchema = z.discriminatedUnion("kind", [
  confirmActionDirectiveSchema,
  ...sharedDirectiveSchemas,
]);

const liveAskOsDirectiveSchema = z.discriminatedUnion("kind", [
  liveConfirmActionDirectiveSchema,
  ...sharedDirectiveSchemas,
]);

export type AskOsDirective = z.infer<typeof askOsDirectiveSchema>;
export type LiveAskOsDirective = z.infer<typeof liveAskOsDirectiveSchema>;
export type ConnectIntegrationDirective = z.infer<typeof connectIntegrationDirectiveSchema>;
export type AskOsActionReceipt = z.infer<typeof askOsActionReceiptSchema>;
export type AskOsDirectiveOf<K extends AskOsDirective["kind"]> = Extract<AskOsDirective, { kind: K }>;

export function directivesOf<K extends AskOsDirective["kind"]>(
  directives: AskOsDirective[],
  kind: K,
): AskOsDirectiveOf<K>[] {
  return directives.filter((d): d is AskOsDirectiveOf<K> => d.kind === kind);
}

const DIRECTIVE_PREFIXES: Array<{ prefix: string; kind: AskOsDirective["kind"] }> = [
  { prefix: "CONFIRM_ACTION:", kind: "confirm-action" },
  { prefix: "CONNECT_INTEGRATION:", kind: "connect-integration" },
  { prefix: "CLARIFY:", kind: "clarify" },
  { prefix: "EVIDENCE:", kind: "evidence" },
  { prefix: "ACTION_PLAN:", kind: "action-plan" },
  { prefix: "CAPABILITY_LIMIT:", kind: "capability-limit" },
  { prefix: "ACTION_RECEIPT:", kind: "action-receipt" },
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
  const { kind, ...body } = directive;
  const entry = DIRECTIVE_PREFIXES.find((candidate) => candidate.kind === kind);
  return `${entry?.prefix ?? ""}${JSON.stringify(body)}`;
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
