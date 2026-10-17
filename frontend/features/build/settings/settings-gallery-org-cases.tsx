"use client";

import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection, PmPanel } from "@/components/pm-chrome";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenRow } from "./agent-token-list";
import { noop } from "./settings-gallery-frames";

export function SettingsGalleryOrgSection() {
  return (
    <>
      <GalleryCase
        id="settings-org-access-loading"
        title="Org access settings — loading skeleton"
      >
        <PageWrapper title="Access">
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-org-integrations-loading"
        title="Org integrations settings — loading skeleton"
      >
        <PageWrapper title="Integrations">
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-credentials-token-list"
        title="Credentials — token list (secret-redaction stub)"
      >
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
                  canRevoke={true}
                />
              </PmPanel>
            </PmSection>
          </PmPageShell>
        </PageWrapper>
      </GalleryCase>
    </>
  );
}
