"use client"

import { ThemeToggle } from "../theme-toggle"
import { UserNav } from "./user-nav"

// For now, simple header.

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { AppSidebar } from "./app-sidebar"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background transition-colors duration-300">
      <div className="flex items-center gap-2 px-4">
        {/* Mobile Sidebar Trigger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <AppSidebar />
            </SheetContent>
          </Sheet>
        </div>

        <div className="font-semibold text-foreground">Dashboard</div> 
      </div>
      <div className="flex items-center gap-2">
         <ThemeToggle />
         <UserNav />
      </div>

    </header>
  )
}
