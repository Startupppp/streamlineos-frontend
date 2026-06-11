import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import { isSuperAdminRole } from "@/lib/rbac/permissions";

export type AppAbility = MongoAbility<[string, string]>;

interface AbilityInput {
  role: string | null | undefined;
  permissions: readonly string[] | null | undefined;
}

export function defineAbilityFor({ role, permissions }: AbilityInput): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (isSuperAdminRole(role)) {
    can("manage", "all");
    return build();
  }

  for (const perm of permissions ?? []) {
    const [domain, resource, action] = perm.split(":");
    if (!domain || !resource || !action) continue;
    can(action, `${domain}:${resource}`);
  }

  return build();
}

export function emptyAbility(): AppAbility {
  return createMongoAbility<[string, string]>([]);
}
