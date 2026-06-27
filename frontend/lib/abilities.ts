import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import { moduleFromPermission } from "@/lib/billing/plan-modules";

export type AppAbility = MongoAbility<[string, string]>;

interface AbilityInput {
  isPlatformAdmin?: boolean;
  isOrgOwner?: boolean;
  permissions?: readonly string[] | null;
  enabledModules?: readonly string[] | null;
}

export function defineAbilityFor({
  isPlatformAdmin,
  isOrgOwner,
  permissions,
  enabledModules,
}: AbilityInput): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (isPlatformAdmin || isOrgOwner) {
    can("manage", "all");
    return build();
  }

  const moduleAllowed = (perm: string) => {
    if (!enabledModules || enabledModules.length === 0) return true;
    const mod = moduleFromPermission(perm);
    if (!mod) return false;
    return enabledModules.includes(mod);
  };

  for (const perm of permissions ?? []) {
    if (!moduleAllowed(perm)) continue;
    const parts = perm.split(":");
    if (parts.length === 3) {
      const [domain, resource, action] = parts;
      if (!domain || !resource || !action) continue;
      const subject = `${domain}:${resource}`;
      can(action, subject);
      if (action === "view") can("read", subject);
      if (action === "manage") {
        can("create", subject);
        can("update", subject);
        can("delete", subject);
      }
    } else if (parts.length === 2) {
      const [domain, action] = parts;
      if (!domain || !action) continue;
      can(action, domain);
      if (action === "view") can("read", domain);
    }
  }

  return build();
}

export function emptyAbility(): AppAbility {
  return createMongoAbility<[string, string]>([]);
}
