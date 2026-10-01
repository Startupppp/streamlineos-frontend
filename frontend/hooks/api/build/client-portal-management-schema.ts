import { z } from "zod";
import { genClientPortalPreviewSchema } from "@/contracts/build-contracts.generated";

export const portalSettingsContract = z.object({
  portalPublishedAt: z.string().nullable(),
  grantCount: z.number().int().nonnegative(),
});

export const portalPreviewContract = genClientPortalPreviewSchema;

export type PortalSettings = z.infer<typeof portalSettingsContract>;
export type PortalPreview = z.infer<typeof portalPreviewContract>;
