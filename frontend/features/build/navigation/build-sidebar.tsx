"use client";

import { usePathname } from "next/navigation";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBuildNotificationUnreadCount } from "@/hooks/api/build/approvals";
import {
  MODULE_ACCENTS,
  type ModuleAccent,
} from "@/components/layout/sidebar/sidebar-nav-items";
import { buildScopeGroupLabel } from "@/lib/build/build-nav-groups";
import {
  isBuildDestinationActive,
  isBuildNavModelEmpty,
} from "@/lib/build/build-nav-model";
import type { BuildNavDestination } from "@/lib/build/nav/build-nav-destination";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { BuildAgentPulse } from "./build-agent-pulse";
import { BuildSidebarSkeleton } from "./build-sidebar-skeleton";
import { BuildMoreToolsMenu } from "./build-more-tools-menu";
import { BuildNavLink } from "./build-nav-link";
import { BuildQuickCreate } from "./build-quick-create";
import { BuildScopeRecovery } from "./build-scope-recovery";
import { BuildScopeSelector } from "./build-scope-selector";
import { useBuildScopeIdentity } from "./use-build-scope-identity";
import { useBuildScopeRecovery } from "./use-build-scope-recovery";
import { useBuildNavModel, useBuildNavView } from "./use-build-nav-model";

const BUILD_ACCENT: ModuleAccent = MODULE_ACCENTS.build;

interface BuildSidebarProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

function SectionLabel({
  label,
  isCollapsed,
}: {
  label: string;
  isCollapsed: boolean;
}) {
  if (isCollapsed)
    return <div aria-hidden className="mx-auto my-1.5 h-px w-5 bg-sidebar-border" />;
  return (
    <p className="px-2 pb-1 pt-2 text-micro font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/65">
      {label}
    </p>
  );
}

export function BuildSidebar({ isCollapsed, onNavigate }: BuildSidebarProps) {
  const pathname = usePathname() ?? "";
  const view = useBuildNavView();
  const {
    model,
    isAccessReady,
    isAccessError,
    refetchAccess,
    isPinned,
    canPinMore,
    togglePin,
  } = useBuildNavModel();
  const { data: buildInbox } = useBuildNotificationUnreadCount();
  const identity = useBuildScopeIdentity(model.scope);
  const fallback = useBuildScopeRecovery({
    scope: model.scope,
    isInaccessible: identity.isInaccessible,
    hasAnyBuildAccess: !isBuildNavModelEmpty(model),
    parentKey: identity.ref.parentKey,
  });

  if (!isAccessReady) {
    if (isAccessError)
      return isCollapsed ? (
        <div className="px-1 py-2">
          <AlertTriangle
            role="img"
            aria-label="Build navigation failed to load"
            className="mx-auto h-5 w-5 text-destructive/70"
          />
        </div>
      ) : (
        <ErrorState
          compact
          title="Couldn't load Build navigation"
          description="Check your connection and try again."
          onRetry={refetchAccess}
        />
      );
    return <BuildSidebarSkeleton isCollapsed={isCollapsed} />;
  }
  if (isBuildNavModelEmpty(model))
    return isCollapsed ? (
      <div className="px-1 py-2">
        <ShieldAlert
          role="img"
          aria-label="Build access required"
          className="mx-auto h-5 w-5 text-muted-foreground"
        />
      </div>
    ) : (
      <NoPermissionState
        compact
        title="Build access required"
        description="Ask your admin for access to Build features."
      />
    );

  function badgeFor(destination: BuildNavDestination): number {
    if (destination.badge !== "inbox-unread") return 0;
    return buildInbox?.count ?? 0;
  }

  function renderDestination(destination: BuildNavDestination) {
    return (
      <BuildNavLink
        key={destination.id}
        destination={destination}
        isActive={isBuildDestinationActive(destination, pathname, view)}
        isCollapsed={isCollapsed}
        accent={BUILD_ACCENT}
        badgeCount={badgeFor(destination)}
        onNavigate={onNavigate}
      />
    );
  }

  function renderPinned(destination: BuildNavDestination) {
    return (
      <BuildNavLink
        key={destination.id}
        destination={destination}
        isActive={isBuildDestinationActive(destination, pathname, view)}
        isCollapsed={isCollapsed}
        accent={BUILD_ACCENT}
        indent={!isCollapsed}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className={cn("flex flex-col", isCollapsed ? "px-1 py-2" : "px-2.5 py-2")}>
      <BuildScopeSelector
        scope={model.scope}
        isCollapsed={isCollapsed}
        onNavigate={onNavigate}
      />
      <BuildScopeRecovery
        fallback={fallback}
        isCollapsed={isCollapsed}
        onNavigate={onNavigate}
      />

      {model.myWork.length > 0 ? (
        <>
          <SectionLabel label="My work" isCollapsed={isCollapsed} />
          <div className="space-y-px">{model.myWork.map(renderDestination)}</div>
        </>
      ) : null}

      {model.primary.length > 0 ? (
        <>
          <SectionLabel
            label={buildScopeGroupLabel(model.scope)}
            isCollapsed={isCollapsed}
          />
          <div className="space-y-px">
            {model.primary.map(renderDestination)}
            {model.pinned.map(renderPinned)}
          </div>
        </>
      ) : null}

      <div className={cn("pt-2", isCollapsed ? "space-y-1" : "space-y-0.5")}>
        <BuildAgentPulse isCollapsed={isCollapsed} onNavigate={onNavigate} />
        <BuildQuickCreate
          scope={model.scope}
          actions={model.createActions}
          isCollapsed={isCollapsed}
          onNavigate={onNavigate}
        />
        <BuildMoreToolsMenu
          tools={model.moreTools}
          pathname={pathname}
          view={view}
          isCollapsed={isCollapsed}
          isPinned={isPinned}
          canPinMore={canPinMore}
          onTogglePin={togglePin}
          onNavigate={onNavigate}
        />
        {model.settings ? renderDestination(model.settings) : null}
        {model.browseAll ? renderDestination(model.browseAll) : null}
      </div>
    </div>
  );
}
