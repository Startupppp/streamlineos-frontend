"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PRODUCT_DEFINITIONS,
  getAccessibleProductHref,
  getNavGroupsForModule,
  isModuleEnabled,
  flattenNavRoutes,
  moduleSwitcherRank,
  type ModuleKey,
} from "../sidebar/sidebar-nav-items";
import { ModuleTile } from "./module-tile";
import { hasAssignedProductAccess } from "@/lib/rbac/route-access/route-access";
import { resolveRememberedProductHref } from "../last-product-path";
import { useLastProductPaths } from "../use-last-product-paths";

export interface ModuleGridProps {
  activeModule: ModuleKey;
  enabledModules: string[];
  lockedModules: string[];
  canManageModules: boolean;
  scopes: Readonly<Record<string, unknown>> | undefined;
  effectiveRole: string;
  onClose: () => void;
  shouldReduceMotion: boolean | null;
}

export function ModuleGrid({
  activeModule,
  enabledModules,
  lockedModules,
  canManageModules,
  scopes,
  effectiveRole,
  onClose,
  shouldReduceMotion,
}: ModuleGridProps) {
  const rememberedPaths = useLastProductPaths();

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
      if (aEnabled !== bEnabled) return aEnabled ? -1 : 1;
      return moduleSwitcherRank(a.key) - moduleSwitcherRank(b.key);
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
            activeModule === product.key && enabled && !product.planLocked;
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
              <ModuleTile
                moduleKey={product.key}
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
