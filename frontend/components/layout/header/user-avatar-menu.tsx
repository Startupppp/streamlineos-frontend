"use client";

import { useCallback } from "react";
import Link from "next/link";
import { User, Settings, Bell, Key, LogOut } from "lucide-react";
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

interface UserAvatarMenuProps {
  variant?: "header" | "bottom-nav";
}

export function UserAvatarMenu({ variant = "header" }: UserAvatarMenuProps) {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const { mutate: handleSignOut, isPending: isSigningOut } = useSignOut();
  const isAdmin = useCan("settings:manage");

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
              <AvatarFallback className="text-[9px] font-bold bg-blue-500/15 text-blue-600">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] leading-none">Me</span>
          </button>
        ) : (
          <button
            type="button"
            className="h-8 w-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-opacity hover:opacity-80"
            aria-label="Account menu"
          >
            <Avatar className="h-8 w-8 ring-2 ring-sidebar-border">
              <AvatarImage src={image} alt={name} />
              <AvatarFallback className="text-[11px] font-bold bg-blue-500/15 text-blue-600">
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
          <p className="text-xs font-semibold text-foreground truncate">
            {name}
          </p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="gap-2 cursor-pointer">
            <User className="h-3.5 w-3.5" />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="gap-2 cursor-pointer">
            <Settings className="h-3.5 w-3.5" />
            My Account
          </Link>
        </DropdownMenuItem>
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
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/settings/api-tokens"
                className="gap-2 cursor-pointer"
              >
                <Key className="h-3.5 w-3.5" />
                API Keys
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="gap-2 cursor-pointer"
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
