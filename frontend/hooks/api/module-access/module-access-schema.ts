import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";
import { dataScopeContract } from "@/hooks/api/access-schema";
import type { ModuleMyPermissions, ModulePermission } from "./types";

/**
 * Module-scoped access reads. `moduleMyPermissionsContract` decides which
 * controls a module owner or admin is shown, so a dropped `isModuleOwner` is a
 * silent demotion rather than a visible failure.
 *
 * Both types are owned by `./types`, which the module's other hooks share;
 * annotating rather than re-inferring keeps one definition and lets the
 * compiler enforce that the contract still matches it.
 */
export const moduleMyPermissionsContract: ResponseContract<ModuleMyPermissions> =
  z.object({
    permissions: z.array(
      z.object({ key: z.string(), scope: dataScopeContract }),
    ),
    isOrgOwner: z.boolean(),
    isOrgAdmin: z.boolean(),
    isModuleOwner: z.boolean(),
    isModuleAdmin: z.boolean(),
  });

export const moduleCatalogContract: ResponseContract<ModulePermission[]> =
  z.array(
    z.object({
      name: z.string(),
      resource: z.string(),
      action: z.string(),
      description: z.string(),
      scopable: z.boolean().optional(),
    }),
  );
