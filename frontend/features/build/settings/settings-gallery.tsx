"use client";

import { ViewCard, type ViewItem } from "@/features/build/views/saved-views/view-card";
import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection, PmPanel } from "@/components/pm-chrome";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { TokenRow } from "./agent-token-list";

function noop() {
  return undefined;
}

const STATIC_VIEWS: ViewItem[] = [
  { id: 1, name: "Engineering backlog", layoutType: "list", isPinned: true, createdBy: "user_a", filters: null },
  { id: 2, name: "Sprint board", layoutType: "board", isPinned: false, createdBy: "user_b", filters: null },
  { id: 3, name: "Roadmap calendar", layoutType: "calendar", isPinned: false, createdBy: "user_a", filters: null },
  { id: 4, name: "Release tracker", layoutType: "table", isPinned: true, createdBy: "user_b", filters: null },
];

export function SettingsGallery() {
  return (
    <>
      <h1>Settings surfaces</h1>
      <div className="flex flex-col gap-8 p-6">
        <GalleryCase id="settings-views-ready" title="Views — ready state">
          <PageWrapper
            title="Saved Views"
            filters={
              <BuildListToolbar
                search={{ value: "", onValueChange: noop, placeholder: "Search views…" }}
              />
            }
          >
            <PmPageShell>
              <PmSection index={0} className="flex-1">
                <PmPanel solid className="flex min-h-0 flex-col p-2">
                  {STATIC_VIEWS.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view}
                      isPinned={view.isPinned}
                      currentUserId="user_a"
                      onNavigate={noop}
                      onTogglePin={noop}
                      onRename={noop}
                      onDelete={noop}
                      canManage={true}
                    />
                  ))}
                </PmPanel>
              </PmSection>
            </PmPageShell>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-views-loading" title="Views — loading skeleton">
          <PageWrapper title="Saved Views">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-views-empty" title="Views — empty state">
          <PageWrapper title="Saved Views">
            <EmptyState title="No saved views yet" />
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-views-denied" title="Views — access denied">
          <PageWrapper title="Saved Views">
            <NoPermissionState />
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-credentials-token-list" title="Credentials — token list (secret-redaction stub)">
          <PageWrapper title="Credentials">
            <PmPageShell>
              <PmSection index={0}>
                <PmPanel className="p-4" solid>
                  <TokenRow
                    token={{
                      id: 99,
                      name: "CI bot",
                      tokenPrefix: "slat_Fa9c",
                      scopes: ["build:read"],
                      createdAt: "2026-01-01T00:00:00Z",
                      expiresAt: null,
                      lastUsedAt: null,
                      revokedAt: null,
                    }}
                    onRevoke={noop}
                  />
                </PmPanel>
              </PmSection>
            </PmPageShell>
          </PageWrapper>
        </GalleryCase>
      </div>
    </>
  );
}
