"use client"

import { useCallback } from "react"
import Link from "next/link"
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react"
import { useSession } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useGetOrganizations, useSwitchOrg } from "@/hooks/common/auth-hooks"

interface WorkspaceSwitcherProps {
  variant?: "header" | "sidebar"
  iconOnly?: boolean
  className?: string
}

interface OrgSwitcherItemProps {
  org: { id: string; name: string }
  isPending: boolean
  onSwitch: (id: string) => void
}

function OrgSwitcherItem({ org, isPending, onSwitch }: OrgSwitcherItemProps) {
  const handleClick = useCallback(() => onSwitch(org.id), [org.id, onSwitch])
  return (
    <DropdownMenuItem
      className="gap-2 cursor-pointer"
      onClick={handleClick}
      disabled={isPending}
    >
      <span className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate text-sm">{org.name}</span>
    </DropdownMenuItem>
  )
}

export function WorkspaceSwitcher({
  variant = "header",
  iconOnly = false,
  className,
}: WorkspaceSwitcherProps) {
  const { data: session } = useSession()
  const { data: organizations } = useGetOrganizations()
  const switchOrg = useSwitchOrg()

  const activeOrgId = session?.orgId as string | null | undefined
  const activeOrg = organizations?.find((o) => o.id === activeOrgId) ?? organizations?.[0]
  const otherOrgs = organizations?.filter((o) => o.id !== activeOrg?.id) ?? []

  const handleSwitch = useCallback(
    (orgId: string) => { switchOrg.mutate(orgId) },
    [switchOrg],
  )

  const isSidebar = variant === "sidebar"
  const workspaceName = activeOrg?.name ?? "Workspace"

  const triggerButton = (
    <button
      type="button"
      className={cn(
        "flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
        iconOnly
          ? "h-8 w-8 justify-center rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          : isSidebar
            ? "gap-1.5 h-8 w-full min-w-0 px-2 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            : "gap-1.5 h-8 px-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted max-w-[160px]",
        className,
      )}
      disabled={switchOrg.isPending}
    >
      <Building2
        className={cn(
          "shrink-0",
          iconOnly ? "h-4 w-4" : "h-3.5 w-3.5",
          isSidebar ? "text-sidebar-foreground/50" : "text-muted-foreground",
        )}
      />
      {!iconOnly && (
        <>
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-sidebar-foreground">
            {workspaceName}
          </span>
          <ChevronsUpDown
            className={cn(
              "h-3 w-3 shrink-0",
              isSidebar ? "text-sidebar-foreground/50" : "text-muted-foreground",
            )}
          />
        </>
      )}
    </button>
  )

  return (
    <DropdownMenu>
      {iconOnly ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
            {workspaceName}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="start" className="w-52">
        <div className="px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Workspaces</p>
        </div>
        <DropdownMenuItem className="gap-2" disabled>
          <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span className="font-medium truncate text-sm">{activeOrg?.name}</span>
        </DropdownMenuItem>
        {otherOrgs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {otherOrgs.map((org) => (
              <OrgSwitcherItem
                key={org.id}
                org={org}
                isPending={switchOrg.isPending}
                onSwitch={handleSwitch}
              />
            ))}
          </>
        )}
        {session?.user?.isOrgOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/setup" className="gap-2 cursor-pointer text-muted-foreground">
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm">Add workspace</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
