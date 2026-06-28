export interface AbilityContext {
  isPlatformAdmin: boolean;
  isOrgOwner: boolean;
  permissions: string[];
  enabledModules: string[];
}

export interface AppAbility {
  can(verb: string, subject: string): boolean;
}

function buildAbility(ctx: AbilityContext): AppAbility {
  const isSuper = ctx.isPlatformAdmin || ctx.isOrgOwner;
  const permSet = new Set(ctx.permissions);

  return {
    can(verb: string, subject: string): boolean {
      if (isSuper) return true;
      const key = `${subject}:${verb}`;
      return permSet.has(key);
    },
  };
}

export function defineAbilityFor(ctx: AbilityContext): AppAbility {
  return buildAbility(ctx);
}

export function emptyAbility(): AppAbility {
  return {
    can(): boolean {
      return false;
    },
  };
}
