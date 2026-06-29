"use client"

import { useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import {
  MagnifyingGlass,
  CalendarBlank,
  ChatCircle,
  Bell,
  Brain,
  List,
} from "@phosphor-icons/react"
import {
  ChevronsUpDown,
  Check,
  Settings,
  LogOut,
} from "lucide-react"
import { resolveImageUrl } from "@/lib/utils"
import { useGetOrganizations, useSwitchOrg, useSignOut } from "@/hooks/common/auth-hooks"
import { useChatUnreadTotal } from "@/hooks/api/chat"
import { useUnreadNotificationCount } from "@/hooks/api/notifications"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopHeaderProps {
  onMobileMenuOpen?: () => void
}

export function TopHeader({ onMobileMenuOpen }: TopHeaderProps) {
  const { data: session } = useSession()
  const { data: organizations } = useGetOrganizations()
  const switchOrg = useSwitchOrg()
  const { mutate: handleSignOut, isPending: isSigningOut } = useSignOut()

  const { data: chatUnread } = useChatUnreadTotal()
  const unreadChatCount = chatUnread?.total ?? 0
  const { data: notifData } = useUnreadNotificationCount()
  const unreadNotifCount = notifData?.count ?? 0

  const activeOrgId = session?.orgId as string | null | undefined
  const activeOrg = organizations?.find((o) => o.id === activeOrgId) ?? organizations?.[0]
  const orgName = activeOrg?.name
  const otherOrgs = organizations?.filter((o) => o.id !== activeOrg?.id) ?? []

  const name = session?.user?.name ?? "User"
  const email = session?.user?.email ?? ""
  const image = resolveImageUrl(session?.user?.image)
  const initials = name.charAt(0).toUpperCase()

  const handleSearchClick = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: navigator.platform?.toUpperCase().includes("MAC") ?? true,
        ctrlKey: !(navigator.platform?.toUpperCase().includes("MAC") ?? true),
        bubbles: true,
      }),
    )
  }, [])

  const handleSwitchOrg = useCallback(
    (orgId: string) => {
      switchOrg.mutate(orgId)
    },
    [switchOrg],
  )

  return (
    <header className="h-12 flex items-center gap-2 border-b border-border bg-background px-3 md:px-4 shrink-0 z-50">
      {onMobileMenuOpen && (
        <button
          type="button"
          onClick={onMobileMenuOpen}
          aria-label="Open navigation"
          className="md:hidden h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <List className="h-4 w-4" weight="regular" />
        </button>
      )}

      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <Link
          href="/dashboard"
          className="h-7 w-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
          aria-label="StreamlineOS home"
        >
          <Image src="/logo.svg" alt="StreamlineOS" width={28} height={28} className="object-contain" />
        </Link>
        {otherOrgs.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden sm:flex items-center gap-1 outline-none group"
                disabled={switchOrg.isPending}
              >
                <span className="text-sm font-semibold text-foreground group-hover:opacity-80 transition-opacity truncate max-w-[120px]">
                  {orgName ?? "StreamlineOS"}
                </span>
                <ChevronsUpDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem className="gap-2" disabled>
                <Check className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-medium truncate">{orgName}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {otherOrgs.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  className="gap-2 cursor-pointer"
                  onClick={() => handleSwitchOrg(org.id)}
                  disabled={switchOrg.isPending}
                >
                  <span className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{org.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            href="/dashboard"
            className="hidden sm:block text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
          >
            {orgName ?? "StreamlineOS"}
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleSearchClick}
        className="flex-1 max-w-xs flex items-center gap-2 h-8 rounded-lg bg-muted border border-border px-3 text-muted-foreground text-xs hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Search"
      >
        <MagnifyingGlass className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left hidden sm:block">Search…</span>
        <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-border bg-background px-1 font-mono text-[9px] text-muted-foreground/60">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <Link
          href="/ai"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="AI Hub"
        >
          <Brain className="h-4 w-4" weight="regular" />
        </Link>
        <Link
          href="/calendar"
          className="hidden md:flex h-8 w-8 rounded-lg items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Calendar"
        >
          <CalendarBlank className="h-4 w-4" weight="regular" />
        </Link>
        <Link
          href="/chat"
          className="relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Chat"
        >
          <ChatCircle
            className="h-4 w-4 transition-all duration-150"
            weight={unreadChatCount > 0 ? "fill" : "regular"}
          />
          {unreadChatCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-background" />
          )}
        </Link>
        <Link
          href="/notifications"
          className="relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell
            className="h-4 w-4 transition-all duration-150"
            weight={unreadNotifCount > 0 ? "fill" : "regular"}
          />
          {unreadNotifCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500 ring-1 ring-background" />
          )}
        </Link>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full"
            aria-label="User menu"
          >
            <Avatar className="h-7 w-7 ring-1 ring-border">
              <AvatarImage src={image} alt={name} />
              <AvatarFallback className="text-[11px] font-bold bg-blue-500/15 text-blue-600">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold text-foreground truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="gap-2 cursor-pointer">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive cursor-pointer"
            onClick={() => handleSignOut()}
            disabled={isSigningOut}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
