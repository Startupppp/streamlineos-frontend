"use client"

import {
  useCallback,
  useState,
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react"
import { PlusIcon } from "@animateicons/react/lucide"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useCommandPalette } from "@/features/command-palette/hooks/use-command-palette"
import {
  QuickCreatePanel,
  useQuickCreateGroups,
} from "./header/quick-create-button"

const MobileCreateTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button">
>(function MobileCreateTrigger(props, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="flex min-w-[44px] flex-col items-center gap-0.5 py-1"
      aria-label="Create"
      {...props}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
        <PlusIcon size={16} />
      </span>
    </button>
  )
})

export function MobileQuickCreateSheet() {
  const [open, setOpen] = useState(false)
  const groups = useQuickCreateGroups()
  const { openCreateTicket } = useCommandPalette()

  const handleNavigate = useCallback(() => setOpen(false), [])

  const handleCreateIssue = useCallback(() => {
    openCreateTicket()
    setOpen(false)
  }, [openCreateTicket])

  if (groups.length === 0) return null

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <MobileCreateTrigger />
      </DrawerTrigger>
      <DrawerContent className="flex max-h-[min(85dvh,32rem)] flex-col gap-0 overflow-hidden rounded-t-xl border bg-card p-0 shadow-2xl">
        <DrawerHeader className="shrink-0 px-4 pb-2 pt-1">
          <DrawerTitle className="text-sm font-semibold text-foreground">
            Create
          </DrawerTitle>
        </DrawerHeader>
        <QuickCreatePanel
          groups={groups}
          onCreateIssue={handleCreateIssue}
          onNavigate={handleNavigate}
        />
      </DrawerContent>
    </Drawer>
  )
}
