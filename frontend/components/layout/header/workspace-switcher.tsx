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
import { useGetOrganizations, useSwitchOrg } from "@/hooks/common/auth-hooks"

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

export function WorkspaceSwitcher() {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-8 px-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring max-w-[160px]"
          disabled={switchOrg.isPending}
        >
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs">{activeOrg?.name ?? "Workspace"}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
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
