"use client";

import { useCallback, useState } from "react";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared";
import { PM_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { RoadmapItemCard, type ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { GalleryCase } from "./goals-gallery-section";

const NOOP = () => undefined;

const STUB_ROADMAP_ITEMS: ScorableRoadmapItem[] = [
  { id: 10, orgId: "org-1", title: "Self-serve billing portal", description: "Let customers upgrade, downgrade and cancel without contacting support.", status: "planned", category: "billing", isPublic: true, projectId: null, epicTicketId: null, targetQuarter: "Q3 2027", sortOrder: 1, votes: 47, createdBy: "u1", createdAt: "2027-01-01T00:00:00Z", updatedAt: "2027-09-01T00:00:00Z" },
  { id: 11, orgId: "org-1", title: "Mobile app for iOS and Android", description: null, status: "in_progress", category: "mobile", isPublic: true, projectId: 1, epicTicketId: null, targetQuarter: "Q4 2027", sortOrder: 2, votes: 31, createdBy: "u1", createdAt: "2027-02-01T00:00:00Z", updatedAt: "2027-09-05T00:00:00Z" },
];

function RoadmapToolbarGallery() {
  const [search, setSearch] = useState("");
  const handleClearAll = useCallback(() => { setSearch(""); }, []);
  return (
    <BuildListToolbar
      search={{ value: search, onValueChange: setSearch, placeholder: "Search roadmap…", label: "Search roadmap items" }}
      filters={[]}
      onClearAll={handleClearAll}
    />
  );
}

function RoadmapGalleryWrapper({ caseId, title, children }: { caseId: string; title: string; children: React.ReactNode }) {
  return (
    <GalleryCase id={caseId} title={title}>
      <PageWrapper
        title="Roadmap"
        subtitle="Plan publicly, collect feedback and ship a changelog"
        actions={<BuildHeaderActions actions={[{ id: "new", label: "New Item", icon: Sparkles, primary: true }]} />}
        filters={<RoadmapToolbarGallery />}
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            {children}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

export function RoadmapGalleryCases() {
  return (
    <>
      <RoadmapGalleryWrapper caseId="roadmap-ready" title="Roadmap — populated">
        <ul className="flex flex-col gap-2" aria-label="Roadmap items">
          {STUB_ROADMAP_ITEMS.map((item) => (
            <li key={item.id}>
              <RoadmapItemCard item={item} onEdit={NOOP} onDelete={NOOP} />
            </li>
          ))}
        </ul>
      </RoadmapGalleryWrapper>

      <RoadmapGalleryWrapper caseId="roadmap-empty-true" title="Roadmap — empty">
        <EmptyState className={PM_FILL_PANEL} illustrationPreset="projects" title="No roadmap items yet" description="Add items to your public roadmap to share what you are building." action={{ label: "New Item", onClick: NOOP }} />
      </RoadmapGalleryWrapper>

      <RoadmapGalleryWrapper caseId="roadmap-error" title="Roadmap — error">
        <ErrorState className="flex-1" title="Couldn't load roadmap" description="An unexpected error occurred. Try again." />
      </RoadmapGalleryWrapper>

      <GalleryCase id="roadmap-denied" title="Roadmap — access denied">
        <NoPermissionState permission="build:roadmap:view" />
      </GalleryCase>
    </>
  );
}
