"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useState } from "react"
import { PlusIcon } from "@animateicons/react/lucide"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { getProductFromPathname } from "./sidebar/sidebar-nav-items"
import {
  GLOBAL_ACTIONS,
  PRODUCT_ACTIONS,
  PRODUCT_LABELS,
} from "./header/quick-create-button"

export function MobileQuickCreateSheet() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const activeProduct = getProductFromPathname(pathname)
  const productActions = PRODUCT_ACTIONS[activeProduct] ?? []
  const visibleGlobalActions = GLOBAL_ACTIONS.filter(
    (action) => !productActions.some((productAction) => productAction.href === action.href),
  )

  const handleClose = useCallback(() => setOpen(false), [])

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
        <div className="flex flex-col gap-1">
          {productActions.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-1 mb-1">
                {PRODUCT_LABELS[activeProduct] ?? activeProduct}
              </p>
              {productActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={handleClose}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {action.label}
                </Link>
              ))}
            </>
          )}
          {visibleGlobalActions.length > 0 && (
            <>
              {productActions.length > 0 && (
                <div className="my-1 h-px bg-border" />
              )}
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-1 mb-1">
                General
              </p>
              {visibleGlobalActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={handleClose}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {action.label}
                </Link>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
