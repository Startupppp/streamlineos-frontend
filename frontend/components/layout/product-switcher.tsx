"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
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
import { cn } from "@/lib/utils"
import {
  getProductFromPathname,
  PRODUCT_DEFINITIONS,
  type ProductKey,
} from "./sidebar/sidebar-nav-items"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

type PhosphorIconComponent = React.ComponentType<{
  className?: string
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"
}>

const PRODUCT_ICONS: Record<ProductKey, PhosphorIconComponent> = {
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

export function ProductSwitcher() {
  const pathname = usePathname()
  const activeProduct = getProductFromPathname(pathname)

  return (
    <nav
      className="h-10 border-b border-border bg-background/90 backdrop-blur-sm shrink-0 z-40"
      aria-label="Product switcher"
    >
      <ScrollArea className="h-full w-full">
        <div className="flex items-center h-full px-3 gap-0.5 min-w-max">
          {PRODUCT_DEFINITIONS.map((product) => {
            const isActive = activeProduct === product.key
            const Icon = PRODUCT_ICONS[product.key]
            return (
              <Link
                key={product.key}
                href={product.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap select-none",
                  isActive
                    ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0 transition-all duration-150"
                  weight={isActive ? "fill" : "regular"}
                />
                <span>{product.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="product-active-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-blue-500"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-[2px]" />
      </ScrollArea>
    </nav>
  )
}
