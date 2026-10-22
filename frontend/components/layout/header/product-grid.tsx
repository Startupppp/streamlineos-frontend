"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PRODUCT_DEFINITIONS,
  getAccessibleProductHref,
  getNavGroupsForModule,
  isModuleEnabled,
  flattenNavRoutes,
  type ModuleKey,
} from "../sidebar/sidebar-nav-items";
import { ProductTile } from "./product-tile";
import { hasAssignedProductAccess } from "@/lib/rbac/route-access/route-access";
import {
  orgScopedStorageKey,
  useOrgStorageScope,
} from "@/lib/org-scoped-storage";
import {
  LAST_PRODUCT_PATHS_STORAGE,
  readLastProductPaths,
  resolveRememberedProductHref,
} from "../last-product-path";

export interface ProductGridProps {
  activeProduct: ModuleKey;
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
  const scope = useOrgStorageScope();
  const rememberedPaths = readLastProductPaths(
    orgScopedStorageKey(LAST_PRODUCT_PATHS_STORAGE, scope),
  );

  const visibleProducts = useMemo(() => {
    const products = PRODUCT_DEFINITIONS.flatMap((product) => {
      if (product.key === "administration") return [];
      const groups = getNavGroupsForModule(
        product.key,
        effectiveRole,
        scopes,
        enabledModules,
        lockedModules,
      );
      const hasAccess = groups.some((group) => group.routes.length > 0);
      if (!hasAccess && !canManageModules && !hasAssignedProductAccess(product.key, scopes))
        return [];
      const planLocked = flattenNavRoutes(
        groups.flatMap((group) => group.routes),
      ).some((route) => route.locked === true);
      const fallbackHref = hasAccess
        ? getAccessibleProductHref(groups, product.href)
        : "/settings/modules";
      return [
        {
          ...product,
          href: hasAccess
            ? resolveRememberedProductHref(
                product.key,
                rememberedPaths[product.key],
                fallbackHref,
              )
            : fallbackHref,
          planLocked,
        },
      ];
    });

    return products.sort((a, b) => {
      const aEnabled = isModuleEnabled(a.key, enabledModules) && !a.planLocked;
      const bEnabled = isModuleEnabled(b.key, enabledModules) && !b.planLocked;
      if (aEnabled === bEnabled) return 0;
      return aEnabled ? -1 : 1;
    });
  }, [
    effectiveRole,
    scopes,
    enabledModules,
    lockedModules,
    canManageModules,
    rememberedPaths,
  ]);

  return (
    <>
      <p className="text-micro uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 px-1">
        Modules
      </p>
      <div className="grid grid-cols-2 gap-1">
        {visibleProducts.map((product, index) => {
          const enabled = isModuleEnabled(product.key, enabledModules);
          const isActive =
            activeProduct === product.key && enabled && !product.planLocked;
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
                planLocked={product.planLocked}
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
