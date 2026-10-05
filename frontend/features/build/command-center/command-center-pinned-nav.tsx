"use client";

import { useCallback, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useAccess } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { IconHandle } from "@animateicons/react";
import { cn } from "@/lib/utils";
import { matchesOrgModule } from "@/lib/org-module-keys";
import {
  COMMAND_CENTER_JUMP_LINKS,
  type CommandCenterJumpLink,
} from "./command-center-jump-links";
import {
  listContainer,
  listItem,
  listItemReduced,
  pmSpring,
} from "@/lib/motion-presets";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";

type IconRef = RefObject<IconHandle | null>;

const shellClass = cn(
  "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-2.5 py-1",
  "text-xs text-muted-foreground shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-card/40",
  "transition-[border-color,background-color,box-shadow,color] duration-150",
  "hover:border-primary/30 hover:bg-primary/[0.05] hover:text-foreground hover:shadow-md",
);

function PinnedChip({
  label,
  href,
  index,
  renderIcon,
}: {
  label: string;
  href: string;
  index: number;
  renderIcon: (ref: IconRef) => ReactNode;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      custom={index}
      whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.03 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={pmSpring}
      className="shrink-0"
    >
      <Link href={href} className={shellClass} {...hoverHandlers}>
        <span className="shrink-0">{renderIcon(iconRef)}</span>
        <span className={TEXT_ONE_LINE}>{label}</span>
      </Link>
    </motion.div>
  );
}

function isOrgModuleEnabled(
  enabledModules: string[],
  moduleKey: string | undefined,
): boolean {
  if (!moduleKey) return true;
  return matchesOrgModule(enabledModules, moduleKey);
}

function hasJumpLinkPermission(
  link: CommandCenterJumpLink,
  can: (permission: PermissionKey) => boolean,
): boolean {
  if (link.permissions.length === 0) return true;
  if (link.permissionMode === "all") {
    return link.permissions.every((permission) => can(permission));
  }
  return link.permissions.some((permission) => can(permission));
}

function isJumpLinkVisible(
  link: CommandCenterJumpLink,
  can: (permission: PermissionKey) => boolean,
  enabledModules: string[],
  accessModules: Record<string, boolean> | undefined,
  defaultProjectId: number | null,
): boolean {
  if (!isOrgModuleEnabled(enabledModules, link.enabledModule)) return false;
  if (
    link.accessModuleKey &&
    accessModules?.[link.accessModuleKey] === false
  ) {
    return false;
  }
  if (link.scope === "project" && defaultProjectId === null) return false;
  return hasJumpLinkPermission(link, can);
}

interface PinnedNavProps {
  defaultProjectId?: number | null;
}

export function PinnedNav({ defaultProjectId = null }: PinnedNavProps) {
  const { data: access } = useAccess();
  const enabledModules = useEnabledModules();

  const can = useCallback(
    (permission: PermissionKey): boolean => {
      if (!access) return false;
      if (access.isOrgOwner) return true;
      return permission in access.scopes;
    },
    [access],
  );

  const visibleLinks = COMMAND_CENTER_JUMP_LINKS.filter((link) =>
    isJumpLinkVisible(
      link,
      can,
      enabledModules,
      access?.modules,
      defaultProjectId,
    ),
  );

  return (
    <div className="min-w-0 w-full max-w-full">
      <motion.div
        className="flex w-full min-w-0 flex-wrap items-center gap-1.5"
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {visibleLinks.map((link, index) => (
          <PinnedChip
            key={link.id}
            label={link.label}
            href={link.buildHref(defaultProjectId)}
            index={index}
            renderIcon={link.renderIcon}
          />
        ))}
      </motion.div>
    </div>
  );
}
