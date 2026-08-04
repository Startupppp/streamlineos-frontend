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
        href: "/build/all?create=1",
        icon: FolderPlus,
        permission: "build:create",
        module: "BUILD",
      },
      {
        id: "new-issue",
        label: "New issue",
        icon: ListPlus,
        permission: "build:tickets:create",
        module: "BUILD",
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
        href: "/users?view=invitations&create=1",
        icon: UserPlus,
        permission: "settings:organization:manage",
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
        href: "/knowledge/wiki?create=1",
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
