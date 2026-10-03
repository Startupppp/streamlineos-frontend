"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, FilePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { useUrlTab } from "@/hooks/api/hr/use-url-tab";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";
import { AttendanceRegularizationDialog } from "@/features/hr/attendance/attendance-regularization-dialog";
import { AttendanceEmailDialog } from "@/features/hr/attendance/attendance-email-dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/i18n";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 h-full min-h-0 w-full flex-1`;
const MY_ATTENDANCE_TABS = ["today", "history"] as const;
const WFH_REQUEST_HREF = "/me/time-off?tab=wfh&wfh=1";

export function MyAttendancePage() {
  const t = useT();
  const router = useRouter();
  const { activeTab, onTabChange } = useUrlTab(MY_ATTENDANCE_TABS, "today");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const handleOpenCorrection = useCallback(() => {
    setCorrectionOpen(true);
  }, []);

  const handleRequestWfh = useCallback(() => {
    router.push(WFH_REQUEST_HREF);
  }, [router]);

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={onTabChange}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <PageWrapper
          title={t("attendance.title")}
          subtitle={t("attendance.subtitle")}
          noInternalScroll
          contentClassName="flex min-h-0 flex-1 flex-col"
          filtersClassName="justify-between"
          filters={
            <>
              <TabsList className="w-full shrink-0 md:w-auto">
                <TabsTrigger value="today" className="gap-1.5 truncate">
                  {t("attendance.tabToday")}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5 truncate">
                  {t("attendance.tabHistory")}
                </TabsTrigger>
              </TabsList>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                >
                  <Link href="/calendar" aria-label={t("attendance.openCalendar")}>
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("attendance.openCalendar")}</span>
                  </Link>
                </Button>

                {activeTab === "today" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={handleOpenCorrection}
                  >
                    <FilePen className="h-3.5 w-3.5" />
                    {t("attendance.requestCorrection")}
                  </Button>
                ) : null}

                {activeTab === "history" ? <AttendanceEmailDialog toolbar /> : null}
              </div>
            </>
          }
        >
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <TabsContent value="today" className={TAB_PANEL_CLASS}>
              <div
                className={cn(
                  CONTENT_FILL_PANEL,
                  "min-h-0 items-center justify-center rounded-xl border border-border bg-card px-4 py-8 sm:px-6",
                )}
              >
                <div className="w-full max-w-sm space-y-3">
                  <TimerCard
                    chrome={false}
                    today
                    onRequestWfh={handleRequestWfh}
                    onRequestRegularization={handleOpenCorrection}
                  />
                  <p className="text-center text-micro text-muted-foreground">
                    {t("attendance.locationDisclosure")}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className={TAB_PANEL_CLASS}>
              <DailyHistoryTable fill chrome={false} />
            </TabsContent>
          </div>
        </PageWrapper>
      </Tabs>

      <AttendanceRegularizationDialog
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        hideTrigger
      />
    </>
  );
}
