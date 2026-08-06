"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarDays, FilePen } from "lucide-react";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { TimerCard } from "@/features/hr/attendance/check-in-button";
import { DailyHistoryTable } from "@/features/hr/attendance/daily-history-table";
import { AttendanceRegularizationDialog } from "@/features/hr/attendance/attendance-regularization-dialog";
import { AttendanceEmailDialog } from "@/features/hr/attendance/attendance-email-dialog";
import { useHrAttendanceStatus } from "@/hooks/api/hr";
import type { AttendanceLog } from "@/types/hr";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 h-full min-h-0 w-full flex-1`;

async function downloadAttendanceReport(logs: AttendanceLog[]) {
  if (logs.length === 0) {
    toast.error("No attendance records to export");
    return;
  }
  try {
    const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
    const rows = logs.map((log) => ({
      date: log.date ? format(new Date(log.date), "yyyy-MM-dd") : "",
      checkIn: log.checkIn ? format(new Date(log.checkIn), "hh:mm a") : "",
      checkOut: log.checkOut ? format(new Date(log.checkOut), "hh:mm a") : "",
      totalHours: log.workHours || "",
      status: log.status || "PRESENT",
    }));
    await downloadXlsx(`attendance-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`, [
      {
        name: "Attendance",
        columns: [
          { header: "Date", key: "date", width: 15 },
          { header: "Check In", key: "checkIn", width: 15 },
          { header: "Check Out", key: "checkOut", width: 15 },
          { header: "Total Hours", key: "totalHours", width: 15 },
          { header: "Status", key: "status", width: 15 },
        ],
        rows,
      },
    ]);
    toast.success("Report downloaded");
  } catch {
    toast.error("Failed to generate report");
  }
}

export function MyAttendancePage() {
  const [tab, setTab] = useState("today");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const { data: statusData } = useHrAttendanceStatus();
  const logs = statusData?.logs ?? [];

  const handleTabChange = useCallback((value: string) => {
    setTab(value);
  }, []);

  const handleOpenCorrection = useCallback(() => {
    setCorrectionOpen(true);
  }, []);

  const handleDownload = useCallback(() => {
    void downloadAttendanceReport(logs);
  }, [logs]);

  return (
    <>
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <PageWrapper
          title="Attendance"
          subtitle="Track your work hours and manage check-ins."
          noInternalScroll
          contentClassName="flex min-h-0 flex-1 flex-col"
          filtersClassName="justify-between"
          filters={
            <>
              <TabsList className="w-full shrink-0 md:w-auto">
                <TabsTrigger value="today" className="gap-1.5 truncate">
                  Today
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5 truncate">
                  History
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
                  <Link href="/calendar">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Open Calendar</span>
                  </Link>
                </Button>

                {tab === "today" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={handleOpenCorrection}
                  >
                    <FilePen className="h-3.5 w-3.5" />
                    Request Correction
                  </Button>
                ) : null}

                {tab === "history" ? (
                  <>
                    <AttendanceEmailDialog toolbar />
                    <AnimatedIconButton
                      icon={DownloadIcon}
                      iconSize={14}
                      iconClassName="mr-1.5"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      disabled={logs.length === 0}
                      onClick={handleDownload}
                    >
                      Export
                    </AnimatedIconButton>
                  </>
                ) : null}
              </div>
            </>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <TabsContent value="today" className={TAB_PANEL_CLASS}>
              <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-xl border border-border bg-card px-4 py-8 sm:px-6">
                <div className="w-full max-w-sm">
                  <TimerCard chrome={false} />
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
