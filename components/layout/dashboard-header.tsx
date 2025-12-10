"use client"

import { ThemeToggle } from "../theme-toggle"
import { Separator } from "../ui/separator"
import { SidebarTrigger } from "../ui/sidebar" // If I use the real sidebar, I need this. But I don't have the real sidebar setup yet.
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
      </div>
    </header>
  )
}
