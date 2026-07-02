"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import { LayoutGrid } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSession } from "next-auth/react"
import { PRODUCT_DEFINITIONS, getProductFromPathname, type ProductKey } from "../sidebar/sidebar-nav-items"
import { cn } from "@/lib/utils"
import { staggerContainer } from "@/lib/motion-variants"

const ICON_STROKE = 1.75

const popoverPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.22, ease: "easeOut" },
  },
}

const productItemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
}

interface ProductSwitcherMenuProps {
  mobile?: boolean
}

export function ProductSwitcherMenu({ mobile = false }: ProductSwitcherMenuProps) {
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

  const visibleProducts = useMemo(
    () => PRODUCT_DEFINITIONS.filter((product) => isProductEnabled(product.key)),
    [isProductEnabled],
  )

  const activeDefinition = PRODUCT_DEFINITIONS.find((p) => p.key === activeProduct)
  const ActiveIcon = activeDefinition?.icon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            mobile
              ? "h-11 w-11 justify-center gap-0 shrink-0"
              : "gap-1.5 h-8 px-2",
          )}
          aria-label="Switch product"
        >
          {mobile ? (
            <LayoutGrid className="h-5 w-5 shrink-0" strokeWidth={ICON_STROKE} />
          ) : (
            <>
              {ActiveIcon ? (
                <ActiveIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={ICON_STROKE} />
              ) : null}
              <span className="hidden lg:inline text-xs truncate max-w-[5rem]">
                {activeDefinition?.label}
              </span>
              <LayoutGrid className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={ICON_STROKE} />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-2.5 data-[state=open]:animate-none data-[state=closed]:animate-none"
        sideOffset={8}
      >
        <motion.div
          variants={popoverPanelVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 px-1"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            Products
          </motion.p>
          <motion.div
            className="grid grid-cols-3 gap-1"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {visibleProducts.map((product) => {
              const Icon = product.icon
              const isActive = activeProduct === product.key
              return (
                <motion.div
                  key={product.key}
                  variants={productItemVariants}
                  whileHover={isActive ? undefined : { scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  animate={
                    isActive
                      ? {
                          scale: 1,
                          boxShadow:
                            "0 0 0 1px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(59, 130, 246, 0.12)",
                        }
                      : { scale: 1, boxShadow: "0 0 0 0px transparent" }
                  }
                  transition={
                    isActive
                      ? { type: "spring", stiffness: 380, damping: 28 }
                      : { duration: 0.15, ease: "easeOut" }
                  }
                >
                  <Link
                    href={product.href}
                    onClick={handleClose}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all duration-150",
                      isActive
                        ? "border border-blue-500/40 bg-blue-50 ring-1 ring-blue-500/20"
                        : "text-muted-foreground hover:bg-muted/80 hover:scale-[1.02]",
                    )}
                  >
                    <span
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        isActive
                          ? "bg-blue-100 text-blue-600"
                          : "bg-muted/50 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={ICON_STROKE} />
                    </span>
                    <span className="text-[11px] font-medium leading-tight">{product.label}</span>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </motion.div>
      </PopoverContent>
    </Popover>
  )
}
