"use client"

import { useState } from "react"
import { UserNav } from "./user-nav"
import { NotificationBell } from "./notification-bell"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { AppSidebar } from "./app-sidebar"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

        <div className="font-semibold text-foreground">Dashboard</div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserNav />
      </div>
    </header>
  )
}
