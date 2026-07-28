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
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { TruncatedText } from "@/components/ui/truncated-text"
import { useGetOrganizations, useSwitchOrg } from "@/hooks/common/auth-hooks"
import { CreateWorkspaceDialog } from "@/components/layout/header/create-workspace-dialog"

interface WorkspaceSwitcherProps {
  variant?: "header" | "sidebar"
  iconOnly?: boolean
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  triggerOnly?: boolean
  onRequestOpen?: () => void
  drawerOnly?: boolean
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
  layout: "dropdown" | "drawer"
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
          <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground/70">
            Organizations
          </p>
        </div>
        <DropdownMenuItem className="gap-2 text-foreground data-[disabled]:opacity-100" disabled>
          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
          <TruncatedText text={activeOrg?.name ?? ""} className="font-medium text-sm text-foreground" />
        </DropdownMenuItem>
        {otherOrgs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {otherOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="gap-2 cursor-pointer text-foreground"
                onClick={() => handleSwitch(org.id)}
                disabled={isPending}
              >
                <span className="h-3.5 w-3.5 shrink-0" />
                <TruncatedText text={org.name} className="text-sm text-foreground" />
              </DropdownMenuItem>
            ))}
          </>
        )}
        {isOrgOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-foreground/80 focus:text-foreground"
              onSelect={handleCreate}
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
              <span className="text-sm">Create organization</span>
            </DropdownMenuItem>
          </>
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 pb-2">
      <div className="px-1 py-1.5">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground/70">
          Organizations
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground">
        <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <TruncatedText text={activeOrg?.name ?? ""} className="font-medium text-foreground" />
      </div>
      {otherOrgs.map((org) => (
        <button
          key={org.id}
          type="button"
          disabled={isPending}
          onClick={() => handleSwitch(org.id)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <span className="h-3.5 w-3.5 shrink-0" />
          <TruncatedText text={org.name} className="text-foreground" />
        </button>
      ))}
      {isOrgOwner && (
        <button
          type="button"
          onClick={handleCreate}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
          <span>Create organization</span>
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
  drawerOnly = false,
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
  const isLabelHidden = isSidebar && iconOnly
  const workspaceName = activeOrg?.name ?? "Organization"

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
      aria-label={isLabelHidden ? workspaceName : undefined}
      className={cn(
        "flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
        isLabelHidden
          ? "h-8 w-8 justify-center rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          : isSidebar
            ? "gap-1.5 h-8 w-full min-w-0 px-2 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            : "gap-1.5 h-8 min-w-0 max-w-[12rem] px-2 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        className,
      )}
      disabled={switchOrg.isPending}
    >
      <Building2
        className={cn(
          "shrink-0",
          isLabelHidden ? "h-4 w-4" : "h-3.5 w-3.5",
          "text-sidebar-foreground/50",
        )}
      />
      {!isLabelHidden && (
        <>
          <TruncatedText text={workspaceName} className="flex-1 text-sm font-medium text-sidebar-foreground" />
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-sidebar-foreground/50" />
        </>
      )}
    </button>
  )

  const createDialog = (
    <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
  )

  if (drawerOnly) {
    return (
      <>
        <Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
          <DrawerContent className="flex h-[min(96dvh,40rem)] max-h-[96dvh] w-full flex-col gap-0 overflow-hidden rounded-t-xl border-t bg-sidebar p-4 pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <DrawerTitle className="sr-only">Organizations</DrawerTitle>
            <WorkspaceSwitcherPanel {...panelProps} layout="drawer" />
          </DrawerContent>
        </Drawer>
        {createDialog}
      </>
    )
  }

  if (triggerOnly) {
    return (
      <>
        {isLabelHidden ? (
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
        {isLabelHidden ? (
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
