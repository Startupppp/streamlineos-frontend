"use client"

import { UserNav } from "./user-nav"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { AppSidebar } from "./app-sidebar"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4 glass transition-colors duration-300">
      <div className="flex items-center gap-2 px-4">
        
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
         <UserNav />
      </div>

    </header>
  )
}
