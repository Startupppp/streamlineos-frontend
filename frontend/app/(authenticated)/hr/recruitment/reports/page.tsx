"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useGenerateReport,
  useScheduledReports,
  useCreateScheduledReport,
  useDeleteScheduledReport,
  ENTITY_FIELDS,
  type ReportEntity,
  type ReportSchedule,
  type GenerateReportResult,
  type ScheduledReport,
} from "@/hooks/hooks";

const HR_ROLES = ["CEO", "HR", "ADMIN", "HR_MANAGER"];

const ENTITY_OPTIONS: { value: ReportEntity; label: string }[] = [
  { value: "candidates", label: "Candidates" },
  { value: "jobs", label: "Job Postings" },
  { value: "interviews", label: "Interviews" },
  { value: "offers", label: "Offers" },
];

function RecipientBadge({
  email,
  onRemove,
}: {
  email: string;
  onRemove: (email: string) => void;
}) {
  function handleRemove() {
    onRemove(email);
  }
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      {email}
      <button onClick={handleRemove} className="ml-0.5 hover:text-destructive">
        ×
      </button>
    </Badge>
  );
}

function ScheduleReportSheet({
  entity,
  fields,
  onClose,
}: {
  entity: ReportEntity;
  fields: string[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState<ReportSchedule>("WEEKLY");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);

  const create = useCreateScheduledReport();

  const handleAddRecipient = useCallback(() => {
    const email = recipientInput.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Invalid email");
      return;
    }
    if (recipients.includes(email)) return;
    setRecipients((prev) => [...prev, email]);
    setRecipientInput("");
  }, [recipientInput, recipients]);

  const handleRemoveRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      toast.error("Report name is required");
      return;
    }
    if (recipients.length === 0) {
      toast.error("At least one recipient required");
      return;
    }
    if (fields.length === 0) {
      toast.error("Select at least one field");
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        reportConfig: { entity, fields, filters: {} },
        schedule,
        recipients,
      },
      {
        onSuccess: () => {
          toast.success("Scheduled report created");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, recipients, fields, entity, schedule, create, onClose]);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }
  function handleScheduleChange(v: string) {
    setSchedule(v as ReportSchedule);
  }
  function handleRecipientInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRecipientInput(e.target.value);
  }
  function handleRecipientKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRecipient();
    }
  }
  function handleSheetOpenChange(v: boolean) {
    if (!v) onClose();
  }

  return (
    <Sheet open onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Schedule Report</SheetTitle>
          <SheetDescription>
            Send this report automatically by email
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-3">
          <div className="space-y-1.5">
            <Label>
              Report Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Weekly Candidates Report"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={schedule} onValueChange={handleScheduleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Weekly (every Monday)</SelectItem>
                <SelectItem value="MONTHLY">Monthly (1st of month)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Recipients</Label>
            <div className="flex gap-2">
              <Input
                value={recipientInput}
                onChange={handleRecipientInputChange}
                onKeyDown={handleRecipientKeyDown}
                placeholder="email@company.com"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleAddRecipient}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {recipients.map((r) => (
                <RecipientBadge
                  key={r}
                  email={r}
                  onRemove={handleRemoveRecipient}
                />
              ))}
            </div>
          </div>
        </div>
        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={create.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="flex-1"
          >
            {create.isPending ? "Saving..." : "Schedule Report"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ScheduledReportItem({
  report,
  onDelete,
}: {
  report: ScheduledReport;
  onDelete: (id: number) => void;
}) {
  function handleDelete() {
    onDelete(report.id);
  }
  return (
    <div className="border rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{report.name}</p>
        <p className="text-xs text-muted-foreground">
          {report.schedule === "WEEKLY" ? "Weekly" : "Monthly"} ·{" "}
          {report.reportConfig.entity} ·{" "}
          {report.recipients.slice(0, 2).join(", ")}
          {report.recipients.length > 2 &&
            ` +${report.recipients.length - 2} more`}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  );
}

function ScheduledReportsList() {
  const { data: reports = [], isLoading } = useScheduledReports();
  const deleteReport = useDeleteScheduledReport();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = useCallback(() => {
    if (deletingId === null) return;
    deleteReport.mutate(deletingId, {
      onSuccess: () => {
        toast.success("Scheduled report deleted");
        setDeletingId(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeletingId(null);
      },
    });
  }, [deletingId, deleteReport]);

  function handleDeleteDialogChange(v: boolean) {
    if (!v) setDeletingId(null);
  }

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (reports.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold mb-3">Scheduled Reports</h3>
      <div className="space-y-2">
        {reports.map((r) => (
          <ScheduledReportItem key={r.id} report={r} onDelete={setDeletingId} />
        ))}
      </div>
      {deletingId !== null && (
        <AlertDialog open onOpenChange={handleDeleteDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
              <AlertDialogDescription>
                This will stop the scheduled emails for this report.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteReport.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteReport.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function ResultTable({ result }: { result: GenerateReportResult }) {
  const headers =
    result.fields.length > 0
      ? result.fields
      : result.rows[0]
        ? Object.keys(result.rows[0])
        : [];

  return (
    <div className="mt-4 rounded-lg border overflow-auto max-h-[50vh]">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h} className="text-xs whitespace-nowrap">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.slice(0, 100).map((row, i) => (
            <TableRow key={i}>
              {headers.map((h) => (
                <TableCell key={h} className="text-xs whitespace-nowrap">
                  {String(row[h] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {result.total > 100 && (
        <p className="text-xs text-muted-foreground text-center py-2 border-t">
          Showing 100 of {result.total} rows — export to see all
        </p>
      )}
    </div>
  );
}

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

  const toggleField = useCallback((field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }, []);

  const handleEntityChange = useCallback((val: ReportEntity) => {
    setEntity(val);
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

  const handleExportCsv = useCallback(async () => {
    if (!result) return;
    const Papa = (await import("papaparse")).default;
    const csv = Papa.unparse(result.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, entity]);

  const handleExportXlsx = useCallback(async () => {
    if (!result) return;
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(entity);
    if (result.rows.length > 0) {
      ws.columns = Object.keys(result.rows[0]).map((key) => ({
        header: key,
        key,
      }));
      result.rows.forEach((row) => ws.addRow(row));
    }
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}-report.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, entity]);

  function handleEntitySelectChange(v: string) {
    handleEntityChange(v as ReportEntity);
  }
  function handleDateFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDateFrom(e.target.value);
  }
  function handleDateToChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDateTo(e.target.value);
  }
  function handleOpenScheduleSheet() {
    setScheduleSheetOpen(true);
  }
  function handleCloseScheduleSheet() {
    setScheduleSheetOpen(false);
  }

  return (
    <PageWrapper
      title="Reports & Exports"
      subtitle="Build custom reports and export recruitment data"
    >
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Report Builder</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Entity</Label>
                <Select value={entity} onValueChange={handleEntitySelectChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-xs"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fields (all if none selected)</Label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 rounded border p-2">
                  {availableFields.map((f) => (
                    <div key={f.value} className="flex items-center gap-2">
                      <Checkbox
                        id={f.value}
                        checked={selectedFields.includes(f.value)}
                        onCheckedChange={() => toggleField(f.value)}
                      />
                      <label
                        htmlFor={f.value}
                        className="text-xs cursor-pointer"
                      >
                        {f.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Date From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={handleDateFromChange}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <Button
                size="sm"
                className="w-full"
                onClick={handleGenerate}
                disabled={generate.isPending}
              >
                {generate.isPending ? "Generating..." : "Generate Report"}
              </Button>
            </CardContent>
          </Card>

          {isHr && <ScheduledReportsList />}
        </div>

        <div>
          {!result && !generate.isPending && (
            <EmptyState
              illustration={<EmptyLeaderboardIllustration />}
              title="No report generated yet"
              description="Configure the report builder on the left and click Generate Report."
            />
          )}

          {generate.isPending && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded" />
              ))}
            </div>
          )}

          {result && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm capitalize">
                    {result.entity} Report
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {result.total} records
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportCsv}>
                    <svg
                      className="mr-1.5 h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportXlsx}
                  >
                    <svg
                      className="mr-1.5 h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                      />
                    </svg>
                    Excel
                  </Button>
                  {isHr && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setScheduleSheetOpen(true)}
                    >
                      Schedule
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {result.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No data matches the selected filters
                  </p>
                ) : (
                  <ResultTable result={result} />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {scheduleSheetOpen && result && (
        <ScheduleReportSheet
          entity={result.entity}
          fields={result.fields}
          onClose={() => setScheduleSheetOpen(false)}
        />
      )}
    </PageWrapper>
  );
}
