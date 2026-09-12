"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { KbLockIcon } from "@/features/wiki/lib/kb-icons";
import { useCan } from "@/hooks/api/access";
import {
  ModuleStatusSection,
  ReviewIntervalsSection,
  QuickLinksSection,
} from "./knowledge-settings-sections";
import { TrashRetentionSection } from "./knowledge-settings-trash-retention";
import { ArticleMigrationSection } from "./knowledge-settings-migration";

export default function KnowledgeSettingsPage() {
  const canManage = useCan("kb:settings:manage");

  if (!canManage) {
    return (
      <PageWrapper title="Settings">
        <EmptyState
          illustration={
            <KbLockIcon className="w-8 text-muted-foreground" />
          }
          title="Access restricted"
          description="You don't have permission to view knowledge base settings."
          className={CONTENT_FILL_PANEL}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Settings"
      subtitle="Knowledge module configuration and defaults"
    >
      <div className="space-y-4">
        <ModuleStatusSection />
        <ReviewIntervalsSection />
        <TrashRetentionSection />
        <ArticleMigrationSection />
        <QuickLinksSection />
      </div>
    </PageWrapper>
  );
}
