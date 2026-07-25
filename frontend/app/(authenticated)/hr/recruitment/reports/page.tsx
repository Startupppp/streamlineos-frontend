"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useGenerateReport,
  ENTITY_FIELDS,
  type ReportEntity,
  type GenerateReportResult,
} from "@/hooks/api";
import { HR_ROLES } from "@/features/hr/recruitment/reports/lib/report-constants";
import { ReportBuilderCard } from "@/features/hr/recruitment/reports/components/report-builder-card";
import { ReportResultPanel } from "@/features/hr/recruitment/reports/components/report-result-panel";
import { ScheduledReportsList } from "@/features/hr/recruitment/reports/components/scheduled-reports-list";
import { ScheduleReportSheet } from "@/features/hr/recruitment/reports/components/schedule-report-sheet";

export default function ReportsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const isHr = HR_ROLES.includes(role);

  const [entity, setEntity] = useState<ReportEntity>("candidates");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [result, setResult] = useState<GenerateReportResult | null>(null);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);

  const generate = useGenerateReport();

  const availableFields = ENTITY_FIELDS[entity];

  const handleFieldToggle = useCallback((field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }, []);

  const handleEntityChange = useCallback((val: string) => {
    setEntity(val as ReportEntity);
    setSelectedFields([]);
    setResult(null);
  }, []);

  const handleGenerate = useCallback(() => {
    const fields =
      selectedFields.length > 0
        ? selectedFields
        : availableFields.map((f) => f.value);
    generate.mutate(
      {
        entity,
        fields,
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      },
      {
        onSuccess: (data) => setResult(data),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [entity, selectedFields, availableFields, dateFrom, dateTo, generate]);

  function handleDateFromChange(value: string) {
    setDateFrom(value);
  }
  function handleDateToChange(value: string) {
    setDateTo(value);
  }
  function handleOpenSchedule() {
    setScheduleSheetOpen(true);
  }
  function handleCloseSchedule() {
    setScheduleSheetOpen(false);
  }

  return (
    <PageWrapper
      title="Reports & Exports"
      subtitle="Build custom reports and export recruitment data"
      variant="display"
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-4">
            <ReportBuilderCard
              entity={entity}
              selectedFields={selectedFields}
              dateFrom={dateFrom}
              dateTo={dateTo}
              isPending={generate.isPending}
              onEntityChange={handleEntityChange}
              onFieldToggle={handleFieldToggle}
              onDateFromChange={handleDateFromChange}
              onDateToChange={handleDateToChange}
              onGenerate={handleGenerate}
            />
            {isHr && <ScheduledReportsList />}
          </div>

          <div>
            <ReportResultPanel
              result={result}
              isPending={generate.isPending}
              isHr={isHr}
              onSchedule={handleOpenSchedule}
            />
          </div>
        </div>
      </div>

      {scheduleSheetOpen && result && (
        <ScheduleReportSheet
          entity={result.entity}
          fields={result.fields}
          onClose={handleCloseSchedule}
        />
      )}
    </PageWrapper>
  );
}
