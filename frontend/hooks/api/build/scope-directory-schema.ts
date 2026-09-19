import { z } from "zod";

export const scopeDirectoryRefSchema = z.object({
  key: z.string(),
  type: z.enum(["organization", "workspace", "product", "project"]),
  id: z.string(),
  name: z.string(),
  parentKey: z.string().nullable(),
  projectKey: z.string().nullable(),
  isArchived: z.boolean(),
});

export const scopeDirectoryResolveContract = z.object({
  data: z.array(scopeDirectoryRefSchema),
});
