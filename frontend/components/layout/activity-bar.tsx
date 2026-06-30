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
    <TooltipProvider>
      <aside
        aria-label="Product switcher"
        className="hidden md:flex w-11 flex-col items-center border-r border-sidebar-border bg-sidebar shrink-0 h-full z-30 py-2"
      >
        <nav className="flex flex-col items-center gap-0.5 w-full px-1">
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
                      "relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-150",
                      isActive
                        ? "text-blue-600 bg-blue-500/10"
                        : "text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="activity-bar-indicator"
                        className="absolute -left-1 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-blue-500"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <Icon
                      className="h-[18px] w-[18px] transition-all duration-150"
                      weight={isActive ? "fill" : "regular"}
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
                  {product.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </aside>
    </TooltipProvider>
  )
}
