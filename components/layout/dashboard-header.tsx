"use client"

import { useState, useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import { UserNav } from "./user-nav"
import { NotificationBell } from "./notification-bell"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Search } from "lucide-react"
import { AppSidebar } from "./app-sidebar"
import { Button } from "@/components/ui/button"

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/hr": "Employees",
  "/hr/leaves": "Leaves",
  "/hr/expenses": "Expenses",
  "/hr/attendance": "Attendance",
  "/hr/payroll": "Payroll",
  "/hr/devices": "Devices",
  "/hr/documents": "Documents",
  "/hr/onboarding": "Onboarding",
  "/hr/work-logs": "Work Logs",
  "/hr/org-chart": "Org Chart",
  "/hr/performance": "Performance",
  "/hr/my-payslips": "My Payslips",
  "/crm/leads": "Lead Pipeline",
  "/crm/deals": "Deals",
  "/crm/targets": "Targets",
  "/crm/analytics": "CRM Analytics",
  "/crm/clients": "Clients",
  "/crm/contacts": "Contacts",
  "/crm/organizations": "Organizations",
  "/projects": "Projects",
  "/timesheets": "Timesheets",
  "/settings": "Settings",
  "/billing": "Billing",
  "/sales": "Sales Dashboard",
  "/customer-executive": "Customer Executive",
  "/chat": "Chat",
  "/support": "Support",
}

export function DashboardHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMac, setIsMac] = useState(true)
  const pathname = usePathname()

  const pageTitle = useMemo(() => {
    if (!pathname) return "Dashboard"
    const sorted = Object.keys(ROUTE_TITLES).sort((a, b) => b.length - a.length)
    for (const route of sorted) {
      if (pathname === route || pathname.startsWith(route + "/")) return ROUTE_TITLES[route]
    }
    return "Dashboard"
  }, [pathname])

  useEffect(() => {
    setIsMac(navigator.platform?.toUpperCase().includes("MAC") || navigator.userAgent?.includes("Mac"))
  }, [])

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4 glass transition-colors duration-300">
      <div className="flex items-center gap-2 px-4">
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} modal>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="z-[100] p-0 w-72">
              <AppSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        <div className="font-semibold text-foreground">{pageTitle}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex items-center gap-2 text-muted-foreground h-8 w-48 justify-start"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: isMac, ctrlKey: !isMac }))}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">{isMac ? "⌘" : "Ctrl"}</span>K
          </kbd>
        </Button>
        <NotificationBell />
        <UserNav />
      </div>
    </header>
  )
}
