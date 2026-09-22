"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { PmPageShell, PmSection, PM_FILL_SECTION } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { parseEnum, useUrlFilters } from "@/lib/url-state/use-url-filters";
import { ReportsAgileTab } from "./reports-agile-tab";
import { ReportsOverviewTab } from "./reports-overview-tab";

const REPORTS_TABS = ["agile", "overview"] as const;
type ReportsTab = typeof REPORTS_TABS[number];
const DEFAULT_TAB: ReportsTab = "agile";

interface ReportsTabsProps {
  projectId: number;
}

export function ReportsTabs({ projectId }: ReportsTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = parseEnum(searchParams.get("tab"), REPORTS_TABS, DEFAULT_TAB);
  const { update } = useUrlFilters();

  const handleTabChange = useCallback(
    (tab: string) => {
      update({ tab: tab === DEFAULT_TAB ? null : tab });
    },
    [update],
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <PageWrapper
        title="Reports"
        subtitle="Agile metrics and project analytics"
        filters={
          <PageTabsToolbar
            tabs={
              <TabsList>
                <TabsTrigger value="agile">Agile Reports</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
              </TabsList>
            }
          />
        }
      >
        <PmPageShell>
          <PmSection index={0} className={PM_FILL_SECTION}>
            <TabsContent
              value="agile"
              className={cn(TABS_CONTENT_PAGE_BODY_CLASS, "gap-4 overflow-y-auto")}
              forceMount
            >
              <ReportsAgileTab projectId={projectId} />
            </TabsContent>
            <TabsContent
              value="overview"
              className={cn(TABS_CONTENT_PAGE_BODY_CLASS, "gap-4 overflow-y-auto")}
            >
              <ReportsOverviewTab projectId={projectId} />
            </TabsContent>
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </Tabs>
  );
}
