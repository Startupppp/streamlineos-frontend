"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnreadNotificationCount } from "@/hooks/api/notifications-inbox";
import { NOTIFICATION_FALLBACK_INTERVAL_MS } from "@/lib/query-request-policies";
import {
  MODULE_ACCENTS,
  type ModuleAccent,
} from "@/components/layout/sidebar/sidebar-nav-items";
import { buildScopeGroupLabel } from "@/lib/build/build-nav-groups";
import {
  isBuildDestinationActive,
  isBuildNavModelEmpty,
  type BuildNavDestination,
} from "@/lib/build/build-nav-model";
import { BuildAgentPulse } from "./build-agent-pulse";
import { BuildMoreToolsMenu } from "./build-more-tools-menu";
import { BuildNavLink } from "./build-nav-link";
import { BuildQuickCreate } from "./build-quick-create";
import { BuildScopeSelector } from "./build-scope-selector";
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

function BuildSidebarSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className={cn("space-y-1.5", isCollapsed ? "px-1 py-2" : "px-2.5 py-2")}>
      <Skeleton className={cn("h-10 rounded-md", isCollapsed ? "mx-auto w-8" : "w-full")} />
      <div className="space-y-px pt-2">
        {Array.from({ length: 7 }).map((_, index) =>
          isCollapsed ? (
            <Skeleton key={index} className="mx-auto h-8 w-8 rounded-sm" />
          ) : (
            <div key={index} className="flex items-center gap-2.5 px-2.5 py-1.5">
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <Skeleton className="h-3.5 max-w-[7rem] flex-1 rounded" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function BuildSidebar({ isCollapsed, onNavigate }: BuildSidebarProps) {
  const pathname = usePathname() ?? "";
  const view = useBuildNavView();
  const { model, isAccessReady, isPinned, canPinMore, togglePin } =
    useBuildNavModel();
  const { data: unreadNotifications } = useUnreadNotificationCount({
    refetchInterval: NOTIFICATION_FALLBACK_INTERVAL_MS,
    refetchIntervalInBackground: false,
    throwOnError: false,
  });

  if (!isAccessReady) return <BuildSidebarSkeleton isCollapsed={isCollapsed} />;
  if (isBuildNavModelEmpty(model)) return null;

  function badgeFor(destination: BuildNavDestination): number {
    if (destination.badge !== "inbox-unread") return 0;
    return unreadNotifications?.count ?? 0;
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
