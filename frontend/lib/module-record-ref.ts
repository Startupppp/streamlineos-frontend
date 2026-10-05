import { z } from "zod";

export const KNOWN_MODULES = [
  "build",
  "crm",
  "timesheets",
  "accounting",
  "invoices",
  "support",
  "kb",
  "hr",
] as const;

export type KnownModule = (typeof KNOWN_MODULES)[number];

export const moduleRecordRefSchema = z.object({
  module: z.enum(KNOWN_MODULES),
  id: z.string().min(1).max(512),
  tenantId: z.string().min(1),
});

export type ModuleRecordRef = z.infer<typeof moduleRecordRefSchema>;

export function makeRef(
  module: KnownModule,
  id: string,
  tenantId: string,
): ModuleRecordRef {
  return { module, id, tenantId };
}

export function refKey(ref: ModuleRecordRef): string {
  return `${ref.module}:${ref.tenantId}:${ref.id}`;
}
