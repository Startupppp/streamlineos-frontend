"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";
import { useCan } from "@/hooks/api/access";
import {
  BUILD_SCOPE_TYPE_LABELS,
  BUILD_ROOT_PATH,
  type BuildScope,
} from "@/lib/build/build-scope";
import { buildOrganizationCatalog } from "@/lib/build/nav/build-organization-catalog";
import { buildProjectCatalog } from "@/lib/build/nav/build-project-catalog";
import { BuildScopeBrowser } from "./build-scope-browser";
import {
  useBuildScopeRecents,
  type BuildScopeRef,
} from "./use-build-nav-preferences";
import { useBuildScopeIdentity } from "./use-build-scope-identity";
import { useHasUnsavedWork } from "@/components/shared/dirty-state-context";

interface BuildScopeSelectorProps {
  scope: BuildScope;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

function scopeAvatarText(ref: BuildScopeRef): string {
  const source = ref.projectKey ?? ref.name;
  return source.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "BD";
}

export function BuildScopeSelector({
  scope,
  isCollapsed,
  onNavigate,
}: BuildScopeSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { recordScope } = useBuildScopeRecents();
  const identity = useBuildScopeIdentity(scope);
  const canUpdateProject = useCan("build:update");
  const canManageIntegrations = useCan("integrations:git:view");
  const hasUnsavedWork = useHasUnsavedWork();
  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty: hasUnsavedWork,
  });

  const currentRef = identity.ref;
  const hasName = currentRef.name.length > 0;

  useEffect(() => {
    if (!hasName || identity.isInaccessible) return;
    recordScope(currentRef);
  }, [hasName, identity.isInaccessible, currentRef, recordScope]);

  const settingsHrefFor = useCallback(
    (target: BuildScopeRef): string | null => {
      if (target.type === "project")
        return canUpdateProject
          ? (buildProjectCatalog(`${BUILD_ROOT_PATH}/${target.id}`).settings
              ?.href ?? null)
          : null;
      if (target.type === "organization")
        return canManageIntegrations
          ? (buildOrganizationCatalog().settings?.href ?? null)
          : null;
      return null;
    },
    [canUpdateProject, canManageIntegrations],
  );

  const navigateToScope = useCallback(
    (target: BuildScopeRef) => {
      recordScope(target);
      onNavigate?.();
      router.push(target.href);
    },
    [recordScope, onNavigate, router],
  );

  const handleSelect = useCallback(
    (target: BuildScopeRef) => {
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
      requestLeave(() => navigateToScope(target));
    },
    [requestLeave, navigateToScope],
  );

  const handleOpenChange = useCallback((next: boolean) => setOpen(next), []);

  const triggerLabel = `Switch Build scope — current: ${
    BUILD_SCOPE_TYPE_LABELS[currentRef.type]
  } ${currentRef.name}`;

  const trigger = isCollapsed ? (
    <button
      ref={triggerRef}
      type="button"
      aria-label={triggerLabel}
      aria-expanded={open}
      aria-haspopup="listbox"
      className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-micro font-bold text-primary transition-colors hover:bg-primary/15 motion-reduce:transition-none"
    >
      {scopeAvatarText(currentRef)}
    </button>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      aria-label={triggerLabel}
      aria-expanded={open}
      aria-haspopup="listbox"
      className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent motion-reduce:transition-none"
    >
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-micro font-bold text-primary"
      >
        {scopeAvatarText(currentRef)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1">
          {identity.isLoading && !hasName ? (
            <Skeleton className="h-3.5 w-24 rounded" />
          ) : (
            <TruncatedText
              text={currentRef.name}
              className="min-w-0 flex-1 text-label font-semibold text-sidebar-foreground"
            />
          )}
          {identity.isArchived ? (
            <Badge
              variant="outline"
              className="h-4 shrink-0 px-1.5 py-0 text-micro"
            >
              Archived
            </Badge>
          ) : null}
        </span>
        <TruncatedText
          text={
            currentRef.parentPath
              ? `${BUILD_SCOPE_TYPE_LABELS[currentRef.type]} · ${currentRef.parentPath}`
              : BUILD_SCOPE_TYPE_LABELS[currentRef.type]
          }
          className="text-micro text-sidebar-foreground/60"
        />
      </span>
      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
    </button>
  );

  return (
    <>
      <ResponsivePopover open={open} onOpenChange={handleOpenChange}>
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <ResponsivePopoverTrigger asChild>{trigger}</ResponsivePopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
              {currentRef.name || BUILD_SCOPE_TYPE_LABELS[currentRef.type]}
            </TooltipContent>
          </Tooltip>
        ) : (
          <ResponsivePopoverTrigger asChild>{trigger}</ResponsivePopoverTrigger>
        )}
        <ResponsivePopoverContent
          title="Switch scope"
          align="start"
          side={isCollapsed ? "right" : "bottom"}
          sideOffset={8}
          className={cn(
            "flex w-80 flex-col overflow-hidden p-0 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
          )}
        >
          <BuildScopeBrowser
            currentScopeKey={currentRef.key}
            settingsHrefFor={settingsHrefFor}
            onSelect={handleSelect}
          />
        </ResponsivePopoverContent>
      </ResponsivePopover>
      <UnsavedChangesDialog
        {...dialogProps}
        title="Unsaved changes in Build"
        description="You have unsaved changes on this page. Discard them to switch scope, or keep editing."
      />
    </>
  );
}
