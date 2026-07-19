"use client";

import { useCallback } from "react";
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
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignOut } from "@/hooks/common/auth-hooks";
import { useCan } from "@/hooks/api/access";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { ThemeMenuSubmenu } from "@/components/theme/theme-switcher";
import { resolveImageUrl, cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

interface UserAvatarMenuProps {
  variant?: "header" | "bottom-nav";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isBottomNav ? (
          <button
            type="button"
            className={cn(
              "flex flex-col items-center gap-0.5 min-w-[44px] py-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md",
              "text-muted-foreground hover:text-foreground",
            )}
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
        ) : (
          <button
            type="button"
            className="size-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-opacity hover:opacity-80"
            aria-label="Account menu"
          >
            <Avatar className="size-8 ring-2 ring-sidebar-border">
              <AvatarImage src={image} alt={name} />
              <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isBottomNav ? "center" : "end"}
        side={isBottomNav || isMobile ? "top" : "bottom"}
        className="w-56"
        sideOffset={8}
      >
        <div className="px-2 py-1.5">
          <TruncatedText text={name} className="text-xs font-semibold text-foreground" />
          <TruncatedText text={email} className="text-[11px] text-muted-foreground mt-0.5" />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="gap-2 cursor-pointer">
            <CircleUser className="h-3.5 w-3.5" />
            My Account
          </Link>
        </DropdownMenuItem>
        {canManageSettings && (
          <DropdownMenuItem asChild>
            <Link href="/billing" className="gap-2 cursor-pointer">
              <CreditCard className="h-3.5 w-3.5" />
              Billing & Plan
            </Link>
          </DropdownMenuItem>
        )}
        {canViewAiCredits && (
          <DropdownMenuItem asChild>
            <Link href="/billing/ai-credits" className="gap-2 cursor-pointer">
              <Zap className="h-3.5 w-3.5" />
              AI Credits
            </Link>
          </DropdownMenuItem>
        )}
        {canSeeOrgPeople && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/organization" className="gap-2 cursor-pointer">
                <Building2 className="h-3.5 w-3.5" />
                Organization
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/users" className="gap-2 cursor-pointer">
                <Users className="h-3.5 w-3.5" />
                People
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {showAccessGroup && (
          <>
            <DropdownMenuSeparator />
            {canManageRbac && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/settings/roles" className="gap-2 cursor-pointer">
                    <Shield className="h-3.5 w-3.5" />
                    Roles
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/permissions" className="gap-2 cursor-pointer">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Permission Matrix
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/rbac" className="gap-2 cursor-pointer">
                    <UserCheck className="h-3.5 w-3.5" />
                    Role Assignment
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/delegations" className="gap-2 cursor-pointer">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Access Policies
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            {canManageSettings && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/settings/modules" className="gap-2 cursor-pointer">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Modules
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/security" className="gap-2 cursor-pointer">
                    <Lock className="h-3.5 w-3.5" />
                    Security
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/notifications/preferences"
            className="gap-2 cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5" />
            Notification Preferences
          </Link>
        </DropdownMenuItem>
        <ThemeMenuSubmenu />
        {canManageSettings && (
          <DropdownMenuItem asChild>
            <Link
              href="/settings/api-tokens"
              className="gap-2 cursor-pointer"
            >
              <Key className="h-3.5 w-3.5" />
              API Keys
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="gap-2 cursor-pointer"
          onClick={handleSignOutClick}
          disabled={isSigningOut}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
