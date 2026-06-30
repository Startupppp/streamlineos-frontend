"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid } from "lucide-react"
import {
  House,
  Handshake,
  UsersThree,
  FolderOpen,
  Package,
  CurrencyDollar,
  Headset,
  Files,
  ChartBar,
  Brain,
  GearSix,
} from "@phosphor-icons/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSession } from "next-auth/react"
import { PRODUCT_DEFINITIONS, getProductFromPathname, type ProductKey } from "../sidebar/sidebar-nav-items"
import { cn } from "@/lib/utils"

type PhosphorIcon = React.ComponentType<{ className?: string; weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone" }>

const PRODUCT_ICONS: Record<ProductKey, PhosphorIcon> = {
  home: House,
  crm: Handshake,
  hrms: UsersThree,
  projects: FolderOpen,
  inventory: Package,
  finance: CurrencyDollar,
  helpdesk: Headset,
  documents: Files,
  analytics: ChartBar,
  ai: Brain,
  administration: GearSix,
}

export function ProductSwitcherMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const activeProduct = getProductFromPathname(pathname)
  const enabledModules = session?.enabledModules ?? []

  const isProductEnabled = useCallback(
    (key: ProductKey) => {
      if (key === "home" || key === "administration") return true
      if (enabledModules.length === 0) return true
      return enabledModules.includes(key)
    },
    [enabledModules],
  )

  const handleClose = useCallback(() => setOpen(false), [])

  const ActiveIcon = PRODUCT_ICONS[activeProduct]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-8 px-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Switch product"
        >
          <ActiveIcon className="h-3.5 w-3.5 shrink-0" weight="fill" />
          <LayoutGrid className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3" sideOffset={8}>
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 px-1">Products</p>
        <div className="grid grid-cols-3 gap-1">
          {PRODUCT_DEFINITIONS.map((product) => {
            if (!isProductEnabled(product.key)) return null
            const Icon = PRODUCT_ICONS[product.key]
            const isActive = activeProduct === product.key
            return (
              <Link
                key={product.key}
                href={product.href}
                onClick={handleClose}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2.5 rounded-lg text-center transition-all duration-150",
                  isActive
                    ? "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon
                  className="h-5 w-5"
                  weight={isActive ? "fill" : "regular"}
                />
                <span className="text-[10px] font-medium leading-none">{product.label}</span>
              </Link>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
