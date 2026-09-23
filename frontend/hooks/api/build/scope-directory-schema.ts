import { z } from "zod";

export const scopeDirectoryRefSchema = z.object({
  key: z.string(),
  type: z.enum(["product", "project"]),
  id: z.string(),
  name: z.string(),
  parentKey: z.string().nullable(),
  projectKey: z.string().nullable(),
  isArchived: z.boolean(),
  parentPath: z.string().nullable(),
  clientPortalEnabled: z.boolean().nullable(),
});

export const scopeDirectoryResolveContract = z.object({
  data: z.array(scopeDirectoryRefSchema),
});
