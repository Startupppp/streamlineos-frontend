"use client"

import { useCallback } from "react"
import Link from "next/link"
import { User, Settings, Bell, Palette, Key, LogOut } from "lucide-react"
import { useSession } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSignOut } from "@/hooks/common/auth-hooks"
import { useCan } from "@/hooks/api/access"
import { resolveImageUrl } from "@/lib/utils"

export function UserAvatarMenu() {
  const { data: session } = useSession()
  const { mutate: handleSignOut, isPending: isSigningOut } = useSignOut()
  const isAdmin = useCan("settings:manage")

  const name = session?.user?.name ?? "User"
  const email = session?.user?.email ?? ""
  const image = resolveImageUrl(session?.user?.image)
  const initials = name.charAt(0).toUpperCase()

  const handleSignOutClick = useCallback(() => { handleSignOut() }, [handleSignOut])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-8 w-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-opacity hover:opacity-80"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8 ring-2 ring-border/50">
            <AvatarImage src={image} alt={name} />
            <AvatarFallback className="text-[11px] font-bold bg-blue-500/15 text-blue-600">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-foreground truncate">{name}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email}</p>
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
          <Link href="/notifications/preferences" className="gap-2 cursor-pointer">
            <Bell className="h-3.5 w-3.5" />
            Notification Preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/appearance" className="gap-2 cursor-pointer">
            <Palette className="h-3.5 w-3.5" />
            Appearance
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/api-tokens" className="gap-2 cursor-pointer">
                <Key className="h-3.5 w-3.5" />
                API Keys
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
          onClick={handleSignOutClick}
          disabled={isSigningOut}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
