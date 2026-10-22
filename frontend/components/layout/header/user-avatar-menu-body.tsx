"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  DrawerClose,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useCan } from "@/hooks/api/access";
import {
  ThemeMenuPanel,
  ThemeModeMenuItems,
} from "@/components/theme/theme-switcher";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PresenceStatusPicker } from "@/components/shared/presence-status-picker";
import { buildMenuEntries } from "./user-avatar-menu-entries";

function AvailabilityHeading() {
  return (
    <p className="px-2 pt-1 text-micro font-medium uppercase tracking-wider text-muted-foreground">
      Availability
    </p>
  );
}

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
    <div className={cn("min-w-0 w-full max-w-full overflow-hidden px-2 py-1.5", className)}>
      <TruncatedText
        text={name}
        className="block w-full min-w-0 text-xs font-semibold text-foreground"
      />
      <TruncatedText
        text={email}
        className="mt-0.5 block w-full min-w-0 text-dense text-muted-foreground"
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

interface UserAvatarMenuBodyProps {
  name: string;
  email: string;
  layout: "dropdown" | "drawer";
}

export function UserAvatarMenuBody({
  name,
  email,
  layout,
}: UserAvatarMenuBodyProps) {
  const canViewSettings = useCan("settings:view");
  const canManageSettings = useCan("settings:manage");
  const canManagePersonalTokens = useCan("settings:api-tokens:read");
  const canManageRbac = useCan("settings:rbac:manage");
  const canViewAiCredits = useCan("billing:ai-credits:view");

  const canSeeOrgPeople = canViewSettings || canManageSettings;
  const showAccessGroup = canManageRbac || canManageSettings;

  const entries = buildMenuEntries({
    canManageSettings,
    canManagePersonalTokens,
    canViewAiCredits,
    canSeeOrgPeople,
    canManageRbac,
    showAccessGroup,
  });

  if (layout === "drawer") {
    return (
      <>
        <DrawerHeader className="min-w-0 shrink-0 overflow-hidden border-b px-4 py-3 text-left">
          <DrawerTitle className="sr-only">Account menu</DrawerTitle>
          <DrawerDescription className="sr-only">
            Your presence status, appearance settings, account and workspace
            links, and the control to sign out.
          </DrawerDescription>
          <UserIdentity name={name} email={email} className="px-0 py-0" />
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          <AvailabilityHeading />
          <PresenceStatusPicker layout="list" />
          <DrawerMenuSeparator />
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
      </>
    );
  }

  return (
    <>
      <UserIdentity name={name} email={email} />
      <DropdownMenuSeparator />
      <AvailabilityHeading />
      <PresenceStatusPicker layout="menu" />
      <DropdownMenuSeparator />
      {entries.map((entry, index) => {
        if (entry.kind === "separator") {
          return <DropdownMenuSeparator key={`sep-${index}`} />;
        }
        if (entry.kind === "theme") {
          return (
            <div key="theme">
              <p className="px-2 py-1.5 text-micro font-medium uppercase tracking-wider text-muted-foreground">
                Appearance
              </p>
              <ThemeModeMenuItems />
            </div>
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
    </>
  );
}
