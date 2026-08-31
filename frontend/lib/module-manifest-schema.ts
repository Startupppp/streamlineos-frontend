import { z } from "zod";

export const moduleLadderSchema = z.enum([
  "delegable",
  "universal",
  "platform-admin",
]);

export const moduleEntrySchema = z.object({
  administrable: z.boolean(),
  administersNamespaces: z.array(z.string()),
  cacheNamespaces: z.array(z.string()),
  displayName: z.string(),
  id: z.string().min(1),
  ladder: moduleLadderSchema,
  moduleFolder: z.string().nullable(),
  planGated: z.boolean(),
  productKey: z.string().nullable(),
  publicExposure: z.boolean(),
  route: z.string().nullable(),
  schemaFolder: z.string().nullable(),
});

export const moduleManifestSchema = z.object({
  modules: z.array(moduleEntrySchema).min(1),
  version: z.number().int().positive(),
});

export type ModuleEntry = z.infer<typeof moduleEntrySchema>;
export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
