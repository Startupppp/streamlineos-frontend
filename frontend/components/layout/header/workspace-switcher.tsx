"use client"

import { useCallback, useState } from "react"
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react"
import { useSession } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useGetOrganizations, useSwitchOrg } from "@/hooks/common/auth-hooks"
import { CreateWorkspaceDialog } from "@/features/workspace/create-workspace-dialog"

interface WorkspaceSwitcherProps {
  variant?: "header" | "sidebar"
  iconOnly?: boolean
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  triggerOnly?: boolean
  onRequestOpen?: () => void
  sheetOnly?: boolean
}

interface WorkspaceOrg {
  id: string
  name: string
}

interface WorkspaceSwitcherPanelProps {
  activeOrg: WorkspaceOrg | undefined
  otherOrgs: WorkspaceOrg[]
  isPending: boolean
  isOrgOwner: boolean
  onSwitch: (orgId: string) => void
  onCreateWorkspace: () => void
  onClose?: () => void
  layout: "dropdown" | "sheet"
}

function WorkspaceSwitcherPanel({
  activeOrg,
  otherOrgs,
  isPending,
  isOrgOwner,
  onSwitch,
  onCreateWorkspace,
  onClose,
  layout,
}: WorkspaceSwitcherPanelProps) {
  const handleSwitch = useCallback(
    (orgId: string) => {
      onSwitch(orgId)
      onClose?.()
    },
    [onSwitch, onClose],
  )

  const handleCreate = useCallback(() => {
    onCreateWorkspace()
    onClose?.()
  }, [onCreateWorkspace, onClose])

  if (layout === "dropdown") {
    return (
      <>
        <div className="px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Workspaces
          </p>
        </div>
        <DropdownMenuItem className="gap-2" disabled>
          <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span className="font-medium truncate text-sm">{activeOrg?.name}</span>
        </DropdownMenuItem>
        {otherOrgs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {otherOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="gap-2 cursor-pointer"
                onClick={() => handleSwitch(org.id)}
                disabled={isPending}
              >
                <span className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-sm">{org.name}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
        {isOrgOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-muted-foreground"
              onSelect={handleCreate}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="text-sm">Create workspace</span>
            </DropdownMenuItem>
          </>
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 pb-2">
      <div className="px-1 py-1.5">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Workspaces
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm">
        <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <span className="font-medium truncate">{activeOrg?.name}</span>
      </div>
      {otherOrgs.map((org) => (
        <button
          key={org.id}
          type="button"
          disabled={isPending}
          onClick={() => handleSwitch(org.id)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50"
        >
          <span className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{org.name}</span>
        </button>
      ))}
      {isOrgOwner && (
        <button
          type="button"
          onClick={handleCreate}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span>Create workspace</span>
        </button>
      )}
    </div>
  )
}

export function WorkspaceSwitcher({
  variant = "header",
  iconOnly = false,
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  triggerOnly = false,
  onRequestOpen,
  sheetOnly = false,
}: WorkspaceSwitcherProps) {
  const { data: session } = useSession()
  const { data: organizations } = useGetOrganizations()
  const switchOrg = useSwitchOrg()
  const [createOpen, setCreateOpen] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const activeOrgId = session?.orgId as string | null | undefined
  const activeOrg = organizations?.find((o) => o.id === activeOrgId) ?? organizations?.[0]
  const otherOrgs = organizations?.filter((o) => o.id !== activeOrg?.id) ?? []
  const isOrgOwner = session?.user?.isOrgOwner === true

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isControlled) {
        controlledOnOpenChange?.(next)
      } else {
        setInternalOpen(next)
      }
    },
    [isControlled, controlledOnOpenChange],
  )

  const handleClose = useCallback(() => handleOpenChange(false), [handleOpenChange])

  const handleSwitch = useCallback(
    (orgId: string) => {
      switchOrg.mutate(orgId)
    },
    [switchOrg],
  )

  const handleCreateWorkspace = useCallback(() => {
    setCreateOpen(true)
  }, [])

  const handleTriggerClick = useCallback(() => {
    if (triggerOnly) {
      onRequestOpen?.()
      return
    }
    handleOpenChange(true)
  }, [triggerOnly, onRequestOpen, handleOpenChange])

  const isSidebar = variant === "sidebar"
  const workspaceName = activeOrg?.name ?? "Workspace"

  const panelProps = {
    activeOrg,
    otherOrgs,
    isPending: switchOrg.isPending,
    isOrgOwner,
    onSwitch: handleSwitch,
    onCreateWorkspace: handleCreateWorkspace,
    onClose: handleClose,
  }

  const triggerButton = (
    <button
      type="button"
      onClick={triggerOnly ? handleTriggerClick : undefined}
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

  const createDialog = (
    <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
  )

  if (sheetOnly) {
    return (
      <>
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className="w-full max-w-none gap-0 p-0 px-4 pb-6 pt-4">
            <WorkspaceSwitcherPanel {...panelProps} layout="sheet" />
          </SheetContent>
        </Sheet>
        {createDialog}
      </>
    )
  }

  if (triggerOnly) {
    return (
      <>
        {iconOnly ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
              {workspaceName}
            </TooltipContent>
          </Tooltip>
        ) : (
          triggerButton
        )}
        {createDialog}
      </>
    )
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
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
          <WorkspaceSwitcherPanel {...panelProps} layout="dropdown" />
        </DropdownMenuContent>
      </DropdownMenu>
      {createDialog}
    </>
  )
}
