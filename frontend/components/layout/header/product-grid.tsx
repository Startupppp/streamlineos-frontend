"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PRODUCT_DEFINITIONS,
  getAccessibleProductHref,
  getNavGroupsForProduct,
  isModuleEnabled,
  type ProductKey,
} from "../sidebar/sidebar-nav-items";
import { ProductTile } from "./product-tile";

const PRODUCT_TO_LOCKED_MODULE: Partial<Record<ProductKey, string>> = {
  payroll: "payroll",
  inventory: "inventory",
};

export interface ProductGridProps {
  activeProduct: ProductKey;
  enabledModules: string[];
  lockedModules: string[];
  canManageModules: boolean;
  scopes: Readonly<Record<string, unknown>> | undefined;
  effectiveRole: string;
  onClose: () => void;
  shouldReduceMotion: boolean | null;
}

export function ProductGrid({
  activeProduct,
  enabledModules,
  lockedModules,
  canManageModules,
  scopes,
  effectiveRole,
  onClose,
  shouldReduceMotion,
}: ProductGridProps) {
  const visibleProducts = useMemo(() => {
    const products = PRODUCT_DEFINITIONS.flatMap((product) => {
      if (product.key === "administration") return [];
      const groups = getNavGroupsForProduct(
        product.key,
        effectiveRole,
        scopes,
        enabledModules,
      );
      const hasAccess = groups.some((group) => group.routes.length > 0);
      if (!hasAccess && !canManageModules) return [];
      return [
        {
          ...product,
          href: hasAccess
            ? getAccessibleProductHref(groups, product.href)
            : "/settings/modules",
        },
      ];
    });

    return products.sort((a, b) => {
      const aLockedKey = PRODUCT_TO_LOCKED_MODULE[a.key];
      const bLockedKey = PRODUCT_TO_LOCKED_MODULE[b.key];
      const aEnabled =
        isModuleEnabled(a.key, enabledModules) &&
        !(aLockedKey !== undefined && lockedModules.includes(aLockedKey));
      const bEnabled =
        isModuleEnabled(b.key, enabledModules) &&
        !(bLockedKey !== undefined && lockedModules.includes(bLockedKey));
      if (aEnabled === bEnabled) return 0;
      return aEnabled ? -1 : 1;
    });
  }, [
    effectiveRole,
    scopes,
    enabledModules,
    lockedModules,
    canManageModules,
  ]);

  return (
    <>
      <p className="text-micro uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 px-1">
        Modules
      </p>
      <div className="grid grid-cols-2 gap-1">
        {visibleProducts.map((product, index) => {
          const enabled = isModuleEnabled(product.key, enabledModules);
          const lockedKey = PRODUCT_TO_LOCKED_MODULE[product.key];
          const planLocked = Boolean(
            lockedKey && lockedModules.includes(lockedKey),
          );
          const isActive = activeProduct === product.key && enabled && !planLocked;
          return (
            <motion.div
              key={product.key}
              initial={
                shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }
              }
              animate={
                shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
              }
              transition={{
                duration: shouldReduceMotion ? 0.12 : 0.14,
                ease: "easeOut",
                delay: shouldReduceMotion ? 0 : index * 0.02,
              }}
            >
              <ProductTile
                productKey={product.key}
                label={product.label}
                href={product.href}
                icon={product.icon}
                isActive={isActive}
                isEnabled={enabled}
                planLocked={planLocked}
                canManageModules={canManageModules}
                onClose={onClose}
              />
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
