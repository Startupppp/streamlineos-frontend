import {
  CircleUser,
  Bell,
  Building2,
  CreditCard,
  Key,
  LayoutGrid,
  Shield,
  ShieldCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Which links the account menu shows, given what the viewer may do.
 *
 * Lives beside the menu body rather than inside it so the body stays under the
 * repo's 300-line ceiling; both sit behind the same lazy boundary.
 */
export type MenuLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type MenuEntry =
  | { kind: "links"; links: MenuLink[] }
  | { kind: "separator" }
  | { kind: "theme" }
  | { kind: "signout" };

export function buildMenuEntries(opts: {
  canManageSettings: boolean;
  canManagePersonalTokens: boolean;
  canViewAiCredits: boolean;
  canSeeOrgPeople: boolean;
  canManageRbac: boolean;
  showAccessGroup: boolean;
}): MenuEntry[] {
  const {
    canManageSettings,
    canManagePersonalTokens,
    canViewAiCredits,
    canSeeOrgPeople,
    canManageRbac,
    showAccessGroup,
  } = opts;

  const accountLinks: MenuLink[] = [
    { href: "/settings", label: "My Account", icon: CircleUser },
  ];
  if (canManageSettings) {
    accountLinks.push({
      href: "/settings/billing",
      label: "Billing & Plan",
      icon: CreditCard,
    });
  }
  if (canViewAiCredits) {
    accountLinks.push({
      href: "/settings/billing/ai-credits",
      label: "AI Credits",
      icon: Zap,
    });
  }

  const entries: MenuEntry[] = [{ kind: "links", links: accountLinks }];

  if (canSeeOrgPeople) {
    entries.push(
      { kind: "separator" },
      {
        kind: "links",
        links: [
          {
            href: "/settings/organization",
            label: "Organization",
            icon: Building2,
          },
          { href: "/settings/users", label: "Members", icon: Users },
        ],
      },
    );
  }

  if (showAccessGroup) {
    const accessLinks: MenuLink[] = [];
    if (canManageRbac) {
      accessLinks.push(
        { href: "/settings/roles", label: "Roles", icon: Shield },
        {
          href: "/settings/delegations",
          label: "Delegations",
          icon: ShieldCheck,
        },
      );
    }
    if (canManageSettings) {
      accessLinks.push(
        { href: "/settings/modules", label: "Modules", icon: LayoutGrid },
      );
    }
    if (accessLinks.length > 0) {
      entries.push({ kind: "separator" }, { kind: "links", links: accessLinks });
    }
  }

  const prefsLinks: MenuLink[] = [
    {
      href: "/notifications/preferences",
      label: "Notification Preferences",
      icon: Bell,
    },
  ];
  if (canManagePersonalTokens) {
    prefsLinks.push({
      href: "/settings/api-tokens",
      label: "Personal Access Tokens",
      icon: Key,
    });
  }

  entries.push(
    { kind: "separator" },
    { kind: "links", links: prefsLinks.slice(0, 1) },
    { kind: "theme" },
  );
  if (prefsLinks.length > 1) {
    entries.push({ kind: "links", links: prefsLinks.slice(1) });
  }
  entries.push({ kind: "separator" }, { kind: "signout" });

  return entries;
}
