"use client";

import { useCallback, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { usePortalSettings, usePublishPortal, useUnpublishPortal } from "@/hooks/api/build/client-portal-management";
import { useProjectClientGrants } from "@/hooks/api/portal-access/grants";
import { GrantRow } from "@/features/build/client-portal/grant-row";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/components/pm-chrome";
import { ClientVisibilityPage } from "@/features/build/client-portal/client-visibility-page";
import { getErrorMessage } from "@/lib/get-error-message";
import { GrantsPager } from "./grants-pager";
import { PublicationStateBanner } from "./publication-state-banner";
import { PortalPreviewSection } from "./portal-preview-section";

const PORTAL_TABS = ["grants", "visibility", "preview"] as const;
type PortalTab = (typeof PORTAL_TABS)[number];

const GRANT_STATUS_OPTIONS = ["active", "expired", "suspended", "revoked"] as const;

const GRANT_FILTER_DEFINITIONS = [
  { param: "grantId" },
  { param: "from" },
  { param: "to" },
  { param: "status", options: GRANT_STATUS_OPTIONS },
] as const;

function isPortalTab(v: string | null): v is PortalTab {
  return v !== null && PORTAL_TABS.some((t) => t === v);
}

function filterValue(raw: string): string | undefined {
  return raw === BUILD_FILTER_ALL ? undefined : raw;
}

function noop() {}

interface ClientPortalManagementPageProps {
  projectId: number;
}

export function ClientPortalManagementPage({ projectId }: ClientPortalManagementPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sectionParam = searchParams.get("section");
  const activeTab: PortalTab = isPortalTab(sectionParam) ? sectionParam : "grants";

  const canManage = useCan("build:clientvisibility:manage");
  const isOnline = useOnlineStatus();
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const handleOpenShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);
  const handleShortcutHelpOpenChange = useCallback(
    (open: boolean) => setShortcutHelpOpen(open),
    [],
  );

  const listFilters = useBuildListFilters({
    filters: GRANT_FILTER_DEFINITIONS,
    withSearch: false,
  });

  const { data: settings, isLoading: settingsLoading, isError: settingsError, error: settingsErrorVal } = usePortalSettings(projectId);
  const { data: grantsPage, isLoading: grantsLoading, isError: grantsError, error: grantsErrorVal } = useProjectClientGrants({
    projectId,
    cursor: listFilters.cursor ?? undefined,
    grantId: filterValue(listFilters.value("grantId")),
    from: filterValue(listFilters.value("from")),
    to: filterValue(listFilters.value("to")),
    state: filterValue(listFilters.value("status")),
  });

  const publishMutation = usePublishPortal(projectId);
  const unpublishMutation = useUnpublishPortal(projectId);

  const pageState = usePageState({
    permission: "build:clientvisibility:manage",
    isLoading: settingsLoading || grantsLoading,
    isError: settingsError || grantsError,
    error: settingsErrorVal ?? grantsErrorVal,
  });

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isPortalTab(value)) return;
      const next = new URLSearchParams(searchParams.toString());
      if (value === "grants") {
        next.delete("section");
      } else {
        next.set("section", value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  function handlePublish() {
    publishMutation.mutate(undefined, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleUnpublish() {
    unpublishMutation.mutate(undefined, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const grants = grantsPage?.data ?? [];
  const isPending = publishMutation.isPending || unpublishMutation.isPending;

  useBuildListKeyboard({
    itemCount: grants.length,
    onOpen: noop,
    onClearSelection: noop,
    onShortcutHelp: handleOpenShortcutHelp,
    enabled: pageState.kind === "ready" && !shortcutHelpOpen,
  });

  return (
    <PageWrapper
      title="Client Portal"
      subtitle="Manage client access and preview the client view"
    >
      <PmPageShell>
        <PmSection index={0}>
          {!isOnline && (
            <p className="mb-2 rounded-md bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
              You&apos;re offline — results may not be up to date
            </p>
          )}
          <PageState
            resolution={pageState}
            loading={
              <div className="flex flex-col gap-2">
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            }
            onRetry={() => {
              void router.refresh();
            }}
          >
            <PublicationStateBanner
              portalPublishedAt={settings?.portalPublishedAt ?? null}
              grantCount={settings?.grantCount ?? 0}
              isPending={isPending}
              canManage={canManage}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
            />
          </PageState>
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col gap-3">
            <PageTabsToolbar
              tabsDensity="labeled"
              tabs={
                <TabsList>
                  <TabsTrigger value="grants">
                    Grants
                    {grants.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                        {grants.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="visibility">Visibility</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              }
            />

            <TabsContent value="grants" className="mt-0 flex min-h-0 flex-1 flex-col">
              {grants.length === 0 ? (
                <EmptyState
                  illustrationPreset="invitation"
                  title={listFilters.isFiltered ? "No matching grants" : "No grants"}
                  description={
                    listFilters.isFiltered
                      ? "No grant matches the current filters. Clear them to see every grant on this project."
                      : "Grant a client portal membership access to this project from Client Access settings."
                  }
                  className="min-h-full w-full flex-1"
                  action={
                    listFilters.isFiltered
                      ? { label: "Clear filters", onClick: listFilters.clearAll }
                      : canManage
                        ? {
                            label: "Manage grants",
                            href: "/build/settings/client-access",
                          }
                        : undefined
                  }
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <PmPanel className="min-h-0 flex-1 overflow-y-auto p-0">
                    {grants.map((grant) => (
                      <GrantRow key={grant.projectClientGrantId} grant={grant} />
                    ))}
                  </PmPanel>
                  <GrantsPager
                    key={listFilters.resetKey}
                    cursor={listFilters.cursor}
                    nextCursor={grantsPage?.pagination.nextCursor ?? null}
                    hasMore={grantsPage?.pagination.hasMore ?? false}
                    isPending={grantsLoading || listFilters.isPending}
                    rowCount={grants.length}
                    onCursorChange={listFilters.setCursor}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="visibility" className="mt-0 flex min-h-0 flex-1 flex-col">
              <ClientVisibilityPage projectId={projectId} sectionParamKey="vsec" standalone={false} />
            </TabsContent>

            <TabsContent value="preview" className="mt-0 flex min-h-0 flex-1 flex-col">
              <PmPanel className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <PortalPreviewSection projectId={projectId} />
              </PmPanel>
            </TabsContent>
          </Tabs>
        </PmSection>
        <ShortcutHelpDialog
          open={shortcutHelpOpen}
          onOpenChange={handleShortcutHelpOpenChange}
        />
      </PmPageShell>
    </PageWrapper>
  );
}
