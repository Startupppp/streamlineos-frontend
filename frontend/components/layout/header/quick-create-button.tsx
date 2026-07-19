"use client"

import Link from "next/link"
import { useMemo } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderPlus,
  ListPlus,
  MessageSquareText,
  Package,
  PenTool,
  Receipt,
  Send,
  TicketPlus,
  UserPlus,
  Users,
} from "lucide-react"
import { PlusIcon } from "@animateicons/react/lucide"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon"
import { useCan } from "@/hooks/api/access"
import { useEnabledModules } from "@/hooks/api/access/org-modules"
import { useCommandPalette } from "@/features/command-palette/hooks/use-command-palette"
import type { PermissionKey } from "@/lib/rbac/permissions"

export interface CreateAction {
  id: string
  label: string
  href?: string
  icon: LucideIcon
  permission?: PermissionKey | readonly PermissionKey[]
  module?: string
  action?: "create-issue"
}

export interface CreateGroup {
  id: string
  label: string
  items: CreateAction[]
}

export const QUICK_CREATE_GROUPS: CreateGroup[] = [
  {
    id: "comms",
    label: "Comms",
    items: [
      {
        id: "send-mail",
        label: "Send mail",
        href: "/mail?compose=1",
        icon: Send,
        permission: "mail:messages:send",
      },
      {
        id: "calendar-event",
        label: "Calendar event",
        href: "/calendar?create=1",
        icon: CalendarDays,
        permission: "calendar:write",
      },
      {
        id: "new-dm",
        label: "New message",
        href: "/chat?dm=1",
        icon: MessageSquareText,
        permission: "chat:channels:write",
      },
    ],
  },
  {
    id: "work",
    label: "Work",
    items: [
      {
        id: "new-project",
        label: "New project",
        href: "/projects/all?create=1",
        icon: FolderPlus,
        permission: "projects:create",
        module: "PROJECTS",
      },
      {
        id: "new-issue",
        label: "New issue",
        icon: ListPlus,
        permission: "projects:tickets:create",
        module: "PROJECTS",
        action: "create-issue",
      },
      {
        id: "support-ticket",
        label: "Support ticket",
        href: "/support/inbox?create=1",
        icon: TicketPlus,
        permission: "support:tickets:create",
        module: "HELPDESK",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    items: [
      {
        id: "new-lead",
        label: "New lead",
        href: "/crm/leads?create=1",
        icon: UserPlus,
        permission: "crm:leads:create",
        module: "CRM",
      },
      {
        id: "new-contact",
        label: "New contact",
        href: "/crm/contacts?create=1",
        icon: Users,
        permission: "crm:contacts:manage",
        module: "CRM",
      },
      {
        id: "new-deal",
        label: "New deal",
        href: "/crm/deals?create=1",
        icon: FileText,
        permission: "crm:deals:create",
        module: "CRM",
      },
      {
        id: "new-company",
        label: "New company",
        href: "/crm/companies?create=1",
        icon: Building2,
        permission: "crm:organizations:manage",
        module: "CRM",
      },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      {
        id: "add-employee",
        label: "Add employee",
        href: "/hr/onboarding",
        icon: UserPlus,
        permission: "hr:employees:create",
        module: "HR",
      },
      {
        id: "leave-request",
        label: "Leave request",
        href: "/hr/leaves?create=1",
        icon: CalendarDays,
        permission: ["hr:leaves:create", "self:leaves"],
        module: "HR",
      },
      {
        id: "invite-user",
        label: "Invite user",
        href: "/users/invitations?create=1",
        icon: UserPlus,
        permission: "hr:employees:create",
      },
    ],
  },
  {
    id: "docs",
    label: "Docs & more",
    items: [
      {
        id: "kb-page",
        label: "Knowledge page",
        href: "/knowledge?create=1",
        icon: FileText,
        permission: "kb:pages:create",
        module: "KB",
      },
      {
        id: "kb-article",
        label: "Help article",
        href: "/support/kb?create=1",
        icon: FileText,
        permission: "kb:articles:create",
        module: "HELPDESK",
      },
      {
        id: "new-survey",
        label: "New survey",
        href: "/surveys/new",
        icon: ClipboardList,
        permission: "surveys:create",
        module: "SURVEYS",
      },
      {
        id: "sign-envelope",
        label: "Sign envelope",
        href: "/sign/envelopes?create=1",
        icon: PenTool,
        permission: "sign:envelope:create",
        module: "SIGN",
      },
      {
        id: "new-invoice",
        label: "New invoice",
        href: "/billing/invoices/new",
        icon: Receipt,
        permission: "accounting:manage",
        module: "FINANCE",
      },
      {
        id: "new-product",
        label: "New product",
        href: "/inventory/products/new",
        icon: Package,
        permission: "inventory:products:create",
        module: "INVENTORY",
      },
    ],
  },
]

function isModuleEnabled(enabledModules: string[], moduleKey?: string): boolean {
  if (!moduleKey) return true
  if (enabledModules.length === 0) return true
  const upper = moduleKey.toUpperCase()
  return enabledModules.some((m) => m.toUpperCase() === upper)
}

export function useQuickCreateGroups(): CreateGroup[] {
  const enabledModules = useEnabledModules()
  const canMail = useCan("mail:messages:send")
  const canCalendar = useCan("calendar:write")
  const canChat = useCan("chat:channels:write")
  const canProject = useCan("projects:create")
  const canIssue = useCan("projects:tickets:create")
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
      ["projects:create", canProject],
      ["projects:tickets:create", canIssue],
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

    return QUICK_CREATE_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          hasPermission(item.permission) &&
          isModuleEnabled(enabledModules, item.module),
      ),
    })).filter((group) => group.items.length > 0)
  }, [
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

export function QuickCreateButton() {
  const groups = useQuickCreateGroups()
  const { openCreateTicket } = useCommandPalette()
  const { iconRef, hoverHandlers } = useAnimatedIcon()

  function handleCreateIssue() {
    openCreateTicket()
  }

  if (groups.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Quick create"
          className="size-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          {...hoverHandlers}
        >
          <PlusIcon ref={iconRef} size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" sideOffset={8}>
        {groups.map((group, groupIndex) => (
          <div key={group.id}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {group.label}
            </DropdownMenuLabel>
            {group.items.map((action) => {
              if (action.action === "create-issue") {
                return (
                  <DropdownMenuItem
                    key={action.id}
                    className="gap-2 cursor-pointer"
                    onClick={handleCreateIssue}
                  >
                    <action.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {action.label}
                  </DropdownMenuItem>
                )
              }
              if (!action.href) return null
              return (
                <DropdownMenuItem key={action.id} asChild>
                  <Link href={action.href} className="gap-2 cursor-pointer">
                    <action.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {action.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
