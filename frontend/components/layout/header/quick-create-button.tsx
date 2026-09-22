"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
} from "react"
import { PlusIcon } from "@animateicons/react/lucide"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon"
import { useIsMobile } from "@/hooks/common/use-mobile"
import { useCan } from "@/hooks/api/access"
import { useEnabledModules } from "@/hooks/api/access/org-modules"
import { useCommandPalette } from "@/components/command-palette/hooks/use-command-palette"
import { cn } from "@/lib/utils"
import { matchesOrgModule } from "@/lib/org-module-keys"
import { getProductFromPathname } from "@/components/layout/sidebar/sidebar-nav-items"
import type { PermissionKey } from "@/lib/rbac/permissions"
import {
  QUICK_CREATE_GROUPS,
  orderGroupsForProduct,
  type CreateGroup,
} from "./quick-create-groups"

const HOVER_CLOSE_DELAY_MS = 200

function isModuleEnabled(enabledModules: string[], moduleKey?: string): boolean {
  if (!moduleKey) return true
  return matchesOrgModule(enabledModules, moduleKey)
}

export function useQuickCreateGroups(): CreateGroup[] {
  const product = getProductFromPathname(usePathname())
  const enabledModules = useEnabledModules()
  const canMail = useCan("mail:messages:send")
  const canCalendar = useCan("calendar:write")
  const canChat = useCan("chat:channels:write")
  const canProject = useCan("build:create")
  const canIssue = useCan("build:tickets:create")
  const canSupport = useCan("support:tickets:create")
  const canLead = useCan("crm:leads:create")
  const canContact = useCan("crm:contacts:manage")
  const canDeal = useCan("crm:deals:create")
  const canCompany = useCan("crm:organizations:manage")
  const canEmployee = useCan("hr:employees:create")
  const canLeaveCreate = useCan("hr:leaves:create")
  const canSelfLeave = useCan("self:leaves")
  const canKbPage = useCan("kb:pages:create")
  const canKbArticle = useCan("kb:articles:create")
  const canSurvey = useCan("surveys:create")
  const canSign = useCan("sign:envelope:create")
  const canAccounting = useCan("accounting:manage")
  const canProduct = useCan("inventory:products:create")

  return useMemo(() => {
    const granted = new Map<PermissionKey, boolean>([
      ["mail:messages:send", canMail],
      ["calendar:write", canCalendar],
      ["chat:channels:write", canChat],
      ["build:create", canProject],
      ["build:tickets:create", canIssue],
      ["support:tickets:create", canSupport],
      ["crm:leads:create", canLead],
      ["crm:contacts:manage", canContact],
      ["crm:deals:create", canDeal],
      ["crm:organizations:manage", canCompany],
      ["hr:employees:create", canEmployee],
      ["hr:leaves:create", canLeaveCreate],
      ["self:leaves", canSelfLeave],
      ["kb:pages:create", canKbPage],
      ["kb:articles:create", canKbArticle],
      ["surveys:create", canSurvey],
      ["sign:envelope:create", canSign],
      ["accounting:manage", canAccounting],
      ["inventory:products:create", canProduct],
    ])

    function hasPermission(permission?: PermissionKey | readonly PermissionKey[]): boolean {
      if (!permission) return true
      if (typeof permission === "string") return granted.get(permission) === true
      return permission.some((key) => granted.get(key) === true)
    }

    const visible = QUICK_CREATE_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          hasPermission(item.permission) &&
          isModuleEnabled(enabledModules, item.module),
      ),
    })).filter((group) => group.items.length > 0)
    return orderGroupsForProduct(visible, product)
  }, [
    product,
    enabledModules,
    canMail,
    canCalendar,
    canChat,
    canProject,
    canIssue,
    canSupport,
    canLead,
    canContact,
    canDeal,
    canCompany,
    canEmployee,
    canLeaveCreate,
    canSelfLeave,
    canKbPage,
    canKbArticle,
    canSurvey,
    canSign,
    canAccounting,
    canProduct,
  ])
}

export function QuickCreatePanel({
  groups,
  onCreateIssue,
  onNavigate,
}: {
  groups: CreateGroup[]
  onCreateIssue: () => void
  onNavigate: () => void
}) {
  return (
    <ScrollArea
      data-testid="quick-create-scrollport"
      className="min-h-0 flex-1"
    >
      <div className="flex flex-col gap-1 px-4 pb-6">
        {groups.map((group, groupIndex) => (
          <div key={group.id}>
            {groupIndex > 0 ? <div className="my-1 h-px bg-border" /> : null}
            <p className="mb-1 px-1 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((action) => {
              if (action.action === "create-issue") {
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={onCreateIssue}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {action.label}
                  </button>
                )
              }
              if (!action.href) return null
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  onClick={onNavigate}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {action.label}
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

const QuickCreateTriggerButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & {
    iconRef: ReturnType<typeof useAnimatedIcon>["iconRef"]
    hoverHandlers: ReturnType<typeof useAnimatedIcon>["hoverHandlers"]
  }
>(function QuickCreateTriggerButton(
  {
    iconRef,
    hoverHandlers,
    className,
    type = "button",
    onMouseEnter,
    onMouseLeave,
    ...props
  },
  ref,
) {
  const { onMouseEnter: onIconMouseEnter, onMouseLeave: onIconMouseLeave } =
    hoverHandlers

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onIconMouseEnter()
      onMouseEnter?.(event)
    },
    [onIconMouseEnter, onMouseEnter],
  )

  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onIconMouseLeave()
      onMouseLeave?.(event)
    },
    [onIconMouseLeave, onMouseLeave],
  )

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className,
      )}
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <PlusIcon ref={iconRef} size={16} />
      Create
    </button>
  )
})

function QuickCreateMenuItems({
  groups,
  onCreateIssue,
  onNavigate,
}: {
  groups: CreateGroup[]
  onCreateIssue: () => void
  onNavigate: () => void
}) {
  return (
    <div className="flex flex-col p-1">
      {groups.map((group, groupIndex) => (
        <div key={group.id}>
          {groupIndex > 0 ? <div className="my-1 h-px bg-border" /> : null}
          <p className="px-2 py-1.5 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          {group.items.map((action) => {
            if (action.action === "create-issue") {
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={onCreateIssue}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <action.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {action.label}
                </button>
              )
            }
            if (!action.href) return null
            return (
              <Link
                key={action.id}
                href={action.href}
                onClick={onNavigate}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <action.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {action.label}
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function QuickCreateButton() {
  const groups = useQuickCreateGroups()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { openCreateTicket } = useCommandPalette()
  const { iconRef, hoverHandlers } = useAnimatedIcon()
  const enableHoverOpen = !isMobile

  const handleOpenChange = useCallback((next: boolean) => {
    setMenuOpen(next)
  }, [])

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const handleHoverEnter = useCallback(() => {
    if (!enableHoverOpen) return
    clearCloseTimeout()
    handleOpenChange(true)
  }, [enableHoverOpen, clearCloseTimeout, handleOpenChange])

  const handleHoverLeave = useCallback(() => {
    if (!enableHoverOpen) return
    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => {
      handleOpenChange(false)
      closeTimeoutRef.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }, [enableHoverOpen, clearCloseTimeout, handleOpenChange])

  useEffect(() => clearCloseTimeout, [clearCloseTimeout])

  const handleCreateIssue = useCallback(() => {
    openCreateTicket()
    setDrawerOpen(false)
    setMenuOpen(false)
  }, [openCreateTicket])

  const handleNavigate = useCallback(() => {
    setDrawerOpen(false)
    setMenuOpen(false)
  }, [])

  if (groups.length === 0) return null

  if (isMobile) {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <QuickCreateTriggerButton iconRef={iconRef} hoverHandlers={hoverHandlers} />
        </DrawerTrigger>
        <DrawerContent className="flex h-[min(85dvh,32rem)] flex-col gap-0 overflow-hidden rounded-t-xl border bg-card p-0 shadow-2xl">
          <DrawerHeader className="shrink-0 px-4 pb-2 pt-1">
            <DrawerTitle className="text-sm font-semibold text-foreground">
              Create
            </DrawerTitle>
          </DrawerHeader>
          <QuickCreatePanel
            groups={groups}
            onCreateIssue={handleCreateIssue}
            onNavigate={handleNavigate}
          />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={menuOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <QuickCreateTriggerButton
          iconRef={iconRef}
          hoverHandlers={hoverHandlers}
          onMouseEnter={handleHoverEnter}
          onMouseLeave={handleHoverLeave}
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={0}
        className="w-52 max-h-[min(22rem,var(--radix-popover-content-available-height))] overflow-hidden p-0"
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      >
        <ScrollArea className="max-h-[min(22rem,var(--radix-popover-content-available-height))]">
          <QuickCreateMenuItems
            groups={groups}
            onCreateIssue={handleCreateIssue}
            onNavigate={handleNavigate}
          />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
