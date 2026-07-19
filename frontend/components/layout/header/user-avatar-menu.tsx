"use client";

import { forwardRef, useCallback, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import {
  CircleUser,
  Bell,
  Building2,
  CreditCard,
  Key,
  LayoutGrid,
  Lock,
  LogOut,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignOut } from "@/hooks/common/auth-hooks";
import { useCan } from "@/hooks/api/access";
import { useIsMobile } from "@/hooks/common/use-mobile";
import {
  ThemeMenuPanel,
  ThemeMenuSubmenu,
} from "@/components/theme/theme-switcher";
import { resolveImageUrl, cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

interface UserAvatarMenuProps {
  variant?: "header" | "bottom-nav";
}

type MenuLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type MenuEntry =
  | { kind: "links"; links: MenuLink[] }
  | { kind: "separator" }
  | { kind: "theme" }
  | { kind: "signout" };

function buildMenuEntries(opts: {
  canManageSettings: boolean;
  canViewAiCredits: boolean;
  canSeeOrgPeople: boolean;
  canManageRbac: boolean;
  showAccessGroup: boolean;
}): MenuEntry[] {
  const {
    canManageSettings,
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
      href: "/billing",
      label: "Billing & Plan",
      icon: CreditCard,
    });
  }
  if (canViewAiCredits) {
    accountLinks.push({
      href: "/billing/ai-credits",
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
          { href: "/users", label: "People", icon: Users },
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
          href: "/settings/permissions",
          label: "Permission Matrix",
          icon: ShieldAlert,
        },
        {
          href: "/settings/rbac",
          label: "Role Assignment",
          icon: UserCheck,
        },
        {
          href: "/settings/delegations",
          label: "Access Policies",
          icon: ShieldCheck,
        },
      );
    }
    if (canManageSettings) {
      accessLinks.push(
        { href: "/settings/modules", label: "Modules", icon: LayoutGrid },
        { href: "/settings/security", label: "Security", icon: Lock },
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
  if (canManageSettings) {
    prefsLinks.push({
      href: "/settings/api-tokens",
      label: "API Keys",
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

const AccountTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & {
    isBottomNav: boolean;
    name: string;
    image: string | undefined;
    initials: string;
  }
>(function AccountTrigger(
  { isBottomNav, name, image, initials, className, type = "button", ...props },
  ref,
) {
  if (isBottomNav) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "flex flex-col items-center gap-0.5 min-w-[44px] py-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md",
          "text-muted-foreground hover:text-foreground",
          className,
        )}
        {...props}
        aria-label="Account menu"
      >
        <Avatar className="h-5 w-5 ring-1 ring-border/60">
          <AvatarImage src={image} alt={name} />
          <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-[10px] leading-none">Me</span>
      </button>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "size-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-opacity hover:opacity-80",
        className,
      )}
      {...props}
      aria-label="Account menu"
    >
      <Avatar className="size-8 ring-2 ring-sidebar-border">
        <AvatarImage src={image} alt={name} />
        <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
    </button>
  );
});

function UserIdentity({
  name,
  email,
  className,
}: {
  name: string;
  email: string;
  className?: string;
}) {
  return (
    <div className={cn("px-2 py-1.5", className)}>
      <TruncatedText text={name} className="text-xs font-semibold text-foreground" />
      <TruncatedText
        text={email}
        className="text-[11px] text-muted-foreground mt-0.5"
      />
    </div>
  );
}

function DrawerMenuLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <DrawerClose asChild>
      <Link
        href={href}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
      >
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        {label}
      </Link>
    </DrawerClose>
  );
}

function DrawerMenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function UserAvatarMenu({ variant = "header" }: UserAvatarMenuProps) {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const { mutate: handleSignOut, isPending: isSigningOut } = useSignOut();
  const canViewSettings = useCan("settings:view");
  const canManageSettings = useCan("settings:manage");
  const canManageRbac = useCan("settings:rbac:manage");
  const canViewAiCredits = useCan("billing:ai-credits:view");

  const canSeeOrgPeople = canViewSettings || canManageSettings;
  const showAccessGroup = canManageRbac || canManageSettings;

  const name = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "";
  const image = resolveImageUrl(session?.user?.image);
  const initials = name.charAt(0).toUpperCase();

  const handleSignOutClick = useCallback(() => {
    handleSignOut();
  }, [handleSignOut]);

  const isBottomNav = variant === "bottom-nav";
  const useDrawer = isMobile || isBottomNav;

  const entries = buildMenuEntries({
    canManageSettings,
    canViewAiCredits,
    canSeeOrgPeople,
    canManageRbac,
    showAccessGroup,
  });

  const trigger = (
    <AccountTrigger
      isBottomNav={isBottomNav}
      name={name}
      image={image}
      initials={initials}
    />
  );

  if (useDrawer) {
    return (
      <Drawer direction="bottom">
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden rounded-t-xl border bg-card p-0 shadow-2xl">
          <DrawerHeader className="shrink-0 border-b px-4 py-3 text-left">
            <DrawerTitle className="sr-only">Account menu</DrawerTitle>
            <UserIdentity name={name} email={email} className="px-0 py-0" />
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {entries.map((entry, index) => {
              if (entry.kind === "separator") {
                return <DrawerMenuSeparator key={`sep-${index}`} />;
              }
              if (entry.kind === "theme") {
                return (
                  <div key="theme" className="px-3 py-2">
                    <ThemeMenuPanel />
                  </div>
                );
              }
              if (entry.kind === "signout") {
                return (
                  <button
                    key="signout"
                    type="button"
                    onClick={handleSignOutClick}
                    disabled={isSigningOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                  </button>
                );
              }
              return entry.links.map((link) => (
                <DrawerMenuLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                />
              ));
            })}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-56" sideOffset={8}>
        <UserIdentity name={name} email={email} />
        {entries.map((entry, index) => {
          if (entry.kind === "separator") {
            return <DropdownMenuSeparator key={`sep-${index}`} />;
          }
          if (entry.kind === "theme") {
            return <ThemeMenuSubmenu key="theme" />;
          }
          if (entry.kind === "signout") {
            return (
              <DropdownMenuItem
                key="signout"
                variant="destructive"
                className="gap-2 cursor-pointer"
                onClick={handleSignOutClick}
                disabled={isSigningOut}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            );
          }
          return entry.links.map((link) => {
            const Icon = link.icon;
            return (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href} className="gap-2 cursor-pointer">
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            );
          });
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
