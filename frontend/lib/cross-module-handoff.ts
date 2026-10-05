import { z } from "zod";
import { KNOWN_MODULES, type KnownModule } from "./module-record-ref";

const handoffPayloadSchema = z.object({
  sourceModule: z.enum(KNOWN_MODULES),
  sourceId: z.string(),
  tenantId: z.string(),
  actorUserId: z.string(),
  sourcePaneState: z.record(z.string(), z.unknown()).optional(),
  returnUrl: z.string().optional(),
  exp: z.number(),
  iat: z.number(),
});

export type HandoffPayload = z.infer<typeof handoffPayloadSchema>;

export type HandoffParseResult =
  | { ok: true; payload: HandoffPayload }
  | { ok: false; reason: "invalid" | "expired" };

export function parseHandoffEnvelope(envelope: string): HandoffParseResult {
  const dot = envelope.lastIndexOf(".");
  if (dot < 1) return { ok: false, reason: "invalid" };

  const encodedPayload = envelope.slice(0, dot);

  let raw: unknown;
  try {
    raw = JSON.parse(atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const parsed = handoffPayloadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (parsed.data.exp < nowSeconds) return { ok: false, reason: "expired" };

  return { ok: true, payload: parsed.data };
}

export function buildHandoffSearchParam(envelope: string): string {
  return `handoff=${encodeURIComponent(envelope)}`;
}

export function extractHandoffParam(searchParams: URLSearchParams): string | null {
  return searchParams.get("handoff");
}

export interface HandoffContext {
  sourceModule: KnownModule;
  sourceId: string;
  returnUrl: string | undefined;
  sourcePaneState: Record<string, unknown> | undefined;
}

export function toHandoffContext(payload: HandoffPayload): HandoffContext {
  return {
    sourceModule: payload.sourceModule,
    sourceId: payload.sourceId,
    returnUrl: payload.returnUrl,
    sourcePaneState: payload.sourcePaneState,
  };
}
