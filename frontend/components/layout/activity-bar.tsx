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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

export function ActivityBar() {
  const pathname = usePathname()
  const activeProduct = getProductFromPathname(pathname)

  return (
    <aside
      aria-label="Product switcher"
      className="hidden md:flex w-12 flex-col items-center border-r border-sidebar-border/60 bg-sidebar shrink-0 h-full z-30 py-3"
    >
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-1 w-full px-1.5">
          {PRODUCT_DEFINITIONS.map((product) => {
            const isActive = activeProduct === product.key
            const Icon = PRODUCT_ICONS[product.key]
            return (
              <Tooltip key={product.key} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={product.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-150",
                      isActive
                        ? "text-blue-600 bg-blue-500/12"
                        : "text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="activity-bar-indicator"
                        className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-blue-500"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <Icon
                      className="h-5 w-5 transition-all duration-150"
                      weight={isActive ? "fill" : "regular"}
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="z-[9999] text-xs font-medium" style={{ zIndex: 9999 }}>
                  {product.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </TooltipProvider>
    </aside>
  )
}
