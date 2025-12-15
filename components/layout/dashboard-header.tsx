"use client"

import { ThemeToggle } from "../theme-toggle"
import { UserNav } from "./user-nav"

// For now, simple header.

export function DashboardHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background transition-colors duration-300">
      <div className="flex items-center gap-2 px-4">
        {/* Placeholder for Sidebar Trigger if we add collapsible sidebar later */}
        <div className="font-semibold text-foreground">Dashboard</div> 
      </div>
      <div className="flex items-center gap-2">
         <ThemeToggle />
         <UserNav />
      </div>

    </header>
  )
}
