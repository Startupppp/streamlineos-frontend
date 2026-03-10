"use client"

import { useState } from "react"
import Link from "next/link"
import { UserNav } from "./user-nav"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Bell } from "lucide-react"
import { AppSidebar } from "./app-sidebar"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { vaivammTrpcClient } from "@/lib/trpc"

export function DashboardHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { data: unreadCount } = useQuery({
    queryKey: ["vaivamm", "notifications", "unreadCount"],
    queryFn: () => vaivammTrpcClient.notifications.getUnreadCount.query(),
    refetchInterval: 30000,
  })

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
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unreadCount && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>
        <UserNav />
      </div>
    </header>
  )
}
