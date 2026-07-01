"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Plus,
  UserPlus,
  FileText,
  FolderPlus,
  TicketPlus,
  Package,
  Receipt,
  Users,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getProductFromPathname } from "../sidebar/sidebar-nav-items"
import type { LucideIcon } from "lucide-react"

interface CreateAction {
  label: string
  href: string
  icon: LucideIcon
}

const PRODUCT_LABELS: Record<string, string> = {
  crm: "CRM",
  hrms: "HRMS",
  projects: "Projects",
  helpdesk: "Helpdesk",
  inventory: "Inventory",
  finance: "Finance",
  documents: "Documents",
  administration: "Administration",
}

const PRODUCT_ACTIONS: Record<string, CreateAction[]> = {
  crm: [
    { label: "New Lead", href: "/crm/leads?create=1", icon: UserPlus },
    { label: "New Contact", href: "/crm/contacts?create=1", icon: Users },
    { label: "New Deal", href: "/crm/deals?create=1", icon: FileText },
  ],
  hrms: [
    { label: "New Employee", href: "/hr/employees?create=1", icon: UserPlus },
    { label: "Leave Request", href: "/hr/leave?create=1", icon: FileText },
  ],
  projects: [
    { label: "New Project", href: "/projects?create=1", icon: FolderPlus },
    { label: "New Task", href: "/projects/tasks?create=1", icon: FileText },
  ],
  helpdesk: [
    { label: "New Ticket", href: "/support/tickets?create=1", icon: TicketPlus },
  ],
  inventory: [
    { label: "New Product", href: "/inventory/products?create=1", icon: Package },
    { label: "Stock Entry", href: "/inventory/stock?create=1", icon: Package },
  ],
  finance: [
    { label: "New Invoice", href: "/accounting/invoices?create=1", icon: Receipt },
    { label: "New Expense", href: "/accounting/expenses?create=1", icon: Receipt },
  ],
  documents: [
    { label: "New Document", href: "/support/kb?create=1", icon: FileText },
  ],
  administration: [
    { label: "Invite User", href: "/users/invite", icon: UserPlus },
  ],
}

const GLOBAL_ACTIONS: CreateAction[] = [
  { label: "New Document", href: "/support/kb?create=1", icon: FileText },
  { label: "Invite User", href: "/users/invite", icon: UserPlus },
]

export function QuickCreateButton() {
  const pathname = usePathname()
  const activeProduct = getProductFromPathname(pathname)
  const productActions = PRODUCT_ACTIONS[activeProduct] ?? []
  const visibleGlobalActions = GLOBAL_ACTIONS.filter(
    (a) => !productActions.some((p) => p.href === a.href),
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Quick create"
          className="h-8 w-8 rounded-lg flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" sideOffset={8}>
        {productActions.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {PRODUCT_LABELS[activeProduct] ?? activeProduct}
            </DropdownMenuLabel>
            {productActions.map((action) => (
              <DropdownMenuItem key={action.href} asChild>
                <Link href={action.href} className="gap-2 cursor-pointer">
                  <action.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {action.label}
                </Link>
              </DropdownMenuItem>
            ))}
            {visibleGlobalActions.length > 0 && <DropdownMenuSeparator />}
          </>
        )}
        {visibleGlobalActions.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              General
            </DropdownMenuLabel>
            {visibleGlobalActions.map((action) => (
              <DropdownMenuItem key={action.href} asChild>
                <Link href={action.href} className="gap-2 cursor-pointer">
                  <action.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {action.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
