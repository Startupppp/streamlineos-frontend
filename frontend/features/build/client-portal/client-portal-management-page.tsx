"use client";

import { useCallback, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { usePortalSettings, usePublishPortal, useUnpublishPortal, usePortalPreview } from "@/hooks/api/build/client-portal-management";
import { useProjectClientGrants } from "@/hooks/api/portal-access/grants";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/components/pm-chrome";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";

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

interface GrantsPagerProps {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  isPending: boolean;
  rowCount: number;
  onCursorChange: (cursor: string | null) => void;
}

function GrantsPager({
  cursor,
  nextCursor,
  hasMore,
  isPending,
  rowCount,
  onCursorChange,
}: GrantsPagerProps) {
  const [trail, setTrail] = useState<string[]>(cursor ? [cursor] : []);

  const handleNext = useCallback(() => {
    if (!nextCursor) return;
    setTrail([...trail, nextCursor]);
    onCursorChange(nextCursor);
  }, [nextCursor, onCursorChange, trail]);

  const handlePrevious = useCallback(() => {
    const next = trail.slice(0, -1);
    setTrail(next);
    onCursorChange(next.at(-1) ?? null);
  }, [onCursorChange, trail]);

  return (
    <TablePagination
      mode="cursor"
      rowCount={rowCount}
      pageNumber={trail.length + 1}
      hasMore={hasMore && nextCursor !== null}
      hasPrevious={trail.length > 0}
      onPrevious={handlePrevious}
      onNext={handleNext}
      disabled={isPending}
    />
  );
}

interface PublicationStateBannerProps {
  portalPublishedAt: string | null;
  grantCount: number;
  isPending: boolean;
  canManage: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}

function PublicationStateBanner({
  portalPublishedAt,
  grantCount,
  isPending,
  canManage,
  onPublish,
  onUnpublish,
}: PublicationStateBannerProps) {
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const isPublished = portalPublishedAt !== null;

  function handleToggle(checked: boolean) {
    if (checked) {
      onPublish();
    } else {
      setConfirmUnpublish(true);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">
            {isPublished ? "Portal published" : "Portal not published"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isPublished
              ? `Published since ${new Date(portalPublishedAt).toLocaleDateString()}. ${grantCount} active ${grantCount === 1 ? "grant" : "grants"}.`
              : "Clients with a grant cannot access the portal until it is published."}
          </span>
        </div>
        <Switch
          checked={isPublished}
          onCheckedChange={handleToggle}
          disabled={isPending || !canManage}
          aria-label={isPublished ? "Unpublish client portal" : "Publish client portal"}
        />
      </div>
      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={setConfirmUnpublish}
        title="Unpublish portal?"
        description="Clients will lose access immediately. Grants are preserved and the portal can be republished."
        confirmLabel="Unpublish"
        onConfirm={onUnpublish}
        destructive
      />
    </>
  );
}

function GrantRow({ grant }: { grant: { projectClientGrantId: string; status: string; contactFirstName: string | null; contactLastName: string | null; expiresAt: string | null; canViewMilestones: boolean; canViewTasks: boolean; canViewAttachments: boolean; canViewComments: boolean; canSubmitChangeRequests: boolean } }) {
  const name =
    [grant.contactFirstName, grant.contactLastName].filter(Boolean).join(" ") ||
    grant.projectClientGrantId.slice(0, 8) + "…";

  const capabilities = [
    grant.canViewMilestones && "Milestones",
    grant.canViewTasks && "Tasks",
    grant.canViewAttachments && "Attachments",
    grant.canViewComments && "Comments",
    grant.canSubmitChangeRequests && "Change Requests",
  ].filter(Boolean);

  return (
    <div className={cn(PM_ROW, "flex-col items-start gap-1 py-3")}>
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <Badge
          variant={grant.status === "ACTIVE" ? "default" : "secondary"}
          className="text-micro"
        >
          {grant.status.toLowerCase()}
        </Badge>
      </div>
      {capabilities.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Can view: {capabilities.join(", ")}
        </p>
      )}
      {grant.expiresAt && (
        <p className="text-xs text-muted-foreground">
          Expires {new Date(grant.expiresAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function PreviewSection({ projectId }: { projectId: number }) {
  const { data, isLoading, isError } = usePortalPreview(projectId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        illustrationPreset="projects"
        title="Preview unavailable"
        description="Unable to load the client view of this project."
        compact
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  const isEmpty =
    data.milestones.length === 0 &&
    data.tasks.length === 0 &&
    data.attachments.length === 0 &&
    data.comments.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        illustrationPreset="ticket"
        title="Nothing visible to clients yet"
        description="Toggle visibility on tickets and milestones to populate the client view."
        compact
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {data.milestones.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Milestones
          </p>
          <div className="flex flex-col gap-1">
            {data.milestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{m.name}</span>
                <Badge variant="outline" className="text-micro">{m.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.tasks.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tasks
          </p>
          <div className="flex flex-col gap-1">
            {data.tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>#{t.ticketNumber} {t.title}</span>
                <Badge variant="outline" className="text-micro">{t.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
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
                      : "Grant a client portal membership access to this project from the Client Access settings."
                  }
                  className="min-h-full w-full flex-1"
                  action={
                    listFilters.isFiltered
                      ? { label: "Clear filters", onClick: listFilters.clearAll }
                      : undefined
                  }
                />
              ) : (
                <>
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
                </>
              )}
            </TabsContent>

            <TabsContent value="visibility" className="mt-0 flex min-h-0 flex-1 flex-col">
              <EmptyState
                illustrationPreset="permissions"
                title="Visibility lives on each item"
                description="Tickets and milestones already marked visible appear in the client portal. Open Preview to see exactly what a client sees today."
                className="min-h-full w-full flex-1"
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-0 flex min-h-0 flex-1 flex-col">
              <PmPanel className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <PreviewSection projectId={projectId} />
              </PmPanel>
            </TabsContent>
          </Tabs>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
