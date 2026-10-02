import { z } from "zod";
import {
  clientPortalManagementGetSettingsResponseSchema,
  clientPortalManagementGetPreviewResponseSchema,
} from "@/contracts/build-contracts.generated";

export const portalSettingsContract = clientPortalManagementGetSettingsResponseSchema;

export const portalPreviewContract = clientPortalManagementGetPreviewResponseSchema;

export type PortalSettings = z.infer<typeof portalSettingsContract>;
export type PortalPreview = z.infer<typeof portalPreviewContract>;
