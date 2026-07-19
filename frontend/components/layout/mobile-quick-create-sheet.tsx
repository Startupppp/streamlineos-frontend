"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import { PlusIcon } from "@animateicons/react/lucide"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useCommandPalette } from "@/features/command-palette/hooks/use-command-palette"
import { useQuickCreateGroups } from "./header/quick-create-button"

export function MobileQuickCreateSheet() {
  const [open, setOpen] = useState(false)
  const groups = useQuickCreateGroups()
  const { openCreateTicket } = useCommandPalette()

  const handleClose = useCallback(() => setOpen(false), [])

  const handleCreateIssue = useCallback(() => {
    openCreateTicket()
    setOpen(false)
  }, [openCreateTicket])

  if (groups.length === 0) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 min-w-[44px] py-1"
          aria-label="Create"
        >
          <span className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm ring-1 ring-primary/20">
            <PlusIcon size={16} />
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="w-full max-w-none gap-0 p-0 px-4 pb-6 pt-4">
        <SheetTitle className="text-sm font-semibold text-foreground mb-3">
          Create
        </SheetTitle>
        <div className="flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
          {groups.map((group, groupIndex) => (
            <div key={group.id}>
              {groupIndex > 0 ? <div className="my-1 h-px bg-border" /> : null}
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-1 mb-1">
                {group.label}
              </p>
              {group.items.map((action) => {
                if (action.action === "create-issue") {
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={handleCreateIssue}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                    >
                      <action.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      {action.label}
                    </button>
                  )
                }
                if (!action.href) return null
                return (
                  <Link
                    key={action.id}
                    href={action.href}
                    onClick={handleClose}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <action.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {action.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
