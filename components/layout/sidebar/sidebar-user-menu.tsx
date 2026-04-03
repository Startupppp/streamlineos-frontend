"use client";

import { useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { resolveImageUrl, cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarUserMenuProps {
  isCollapsed: boolean;
  isAdmin: boolean;
}

export function SidebarUserMenu({ isCollapsed, isAdmin }: SidebarUserMenuProps) {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className={cn("py-4 border-t border-sidebar-border", isCollapsed ? "px-2" : "px-3")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-auto hover:bg-sidebar-accent",
              isCollapsed ? "justify-center px-2 py-2" : "justify-start gap-3 px-3 py-2"
            )}
          >
            <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
              <AvatarImage src={resolveImageUrl(session?.user?.image)} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col items-start overflow-hidden">
                <span className="font-medium text-sm text-sidebar-foreground truncate max-w-[140px]">
                  {session?.user?.name || "User"}
                </span>
                <span className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">
                  {session?.user?.email}
                </span>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin && (
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              signOut({ callbackUrl: "/signin" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
