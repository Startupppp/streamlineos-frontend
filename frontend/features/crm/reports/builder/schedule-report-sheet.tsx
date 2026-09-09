"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AppSheet } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useCan } from "@/hooks/api/access";
import {
  useCreateReportSchedule,
  useDeleteReportSchedule,
  useReportSchedules,
  useUpdateReportSchedule,
} from "@/hooks/api/crm/reporting";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatRelativeTime } from "@/lib/date-utils";
import {
  MAX_REPORT_DAY_OF_MONTH,
  REPORT_CADENCES,
  type ReportCadence,
  type ReportSchedule,
} from "@/types/crm/reporting";
import {
  CADENCE_LABELS,
  HOUR_OPTIONS,
  WEEKDAY_OPTIONS,
  describeSchedule,
} from "./report-schedule-copy";

interface ScheduleReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportDefinitionId: string;
  reportName: string;
}

/**
 * When this report should arrive, and to whom.
 *
 * A schedule runs under the authority of whoever created it — the server
 * records it and refuses when that person's access to the source is withdrawn.
 * That is said on screen rather than left implicit, because the failure it
 * produces (a report that quietly stops arriving) is otherwise indistinguishable
 * from nobody having set one up.
 */
export function ScheduleReportSheet({
  open,
  onOpenChange,
  reportDefinitionId,
  reportName,
}: ScheduleReportSheetProps) {
  const canManage = useCan("crm:reporting:manage");
  const schedules = useReportSchedules();
  const create = useCreateReportSchedule();
  const update = useUpdateReportSchedule();
  const remove = useDeleteReportSchedule();

  const [cadence, setCadence] = useState<ReportCadence>("weekly");
  const [hourOfDay, setHourOfDay] = useState(8);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [recipients, setRecipients] = useState("");

  const mine = (schedules.data ?? []).filter(
    (schedule) => schedule.reportDefinitionId === reportDefinitionId,
  );

  function handleCreate() {
    const addresses = recipients
      .split(/[\s,;]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry !== "");

    if (addresses.length === 0) {
      toast.error("Add at least one address — a schedule with no recipients delivers to nobody.");
      return;
    }

    create.mutate(
      {
        reportDefinitionId,
        cadence,
        hourOfDay,
        ...(cadence === "weekly" ? { dayOfWeek } : {}),
        ...(cadence === "monthly" ? { dayOfMonth } : {}),
        recipients: addresses,
      },
      {
        onSuccess: () => {
          setRecipients("");
          toast.success(`"${reportName}" will be sent ${CADENCE_LABELS[cadence].toLowerCase()}`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function makeToggleHandler(schedule: ReportSchedule) {
    return (enabled: boolean) => {
      update.mutate(
        { reportScheduleId: schedule.reportScheduleId, enabled },
        { onError: (error) => toast.error(getErrorMessage(error)) },
      );
    };
  }

  function makeDeleteHandler(schedule: ReportSchedule) {
    return () => {
      remove.mutate(
        { reportScheduleId: schedule.reportScheduleId },
        {
          onSuccess: () => toast.success("Schedule removed"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    };
  }

  function handleRetry() {
    void schedules.refetch();
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Send this report on a schedule"
      description={`"${reportName}" is re-run against current data each time it goes out.`}
      className="sm:max-w-lg"
    >
      {schedules.access.denied ? (
        <NoPermissionState permission="crm:reporting:view" className="flex-1" />
      ) : schedules.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load the schedules"
          description={getErrorMessage(schedules.error)}
          onRetry={handleRetry}
        />
      ) : schedules.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-gap-section">
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This report is only run when somebody opens it.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {mine.map((schedule) => (
                <ScheduleRow
                  key={schedule.reportScheduleId}
                  schedule={schedule}
                  canManage={canManage}
                  isBusy={update.isPending || remove.isPending}
                  onToggle={makeToggleHandler(schedule)}
                  onDelete={makeDeleteHandler(schedule)}
                />
              ))}
            </div>
          )}

          {canManage ? (
            <div className="flex flex-col gap-gap-field border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-gap-field">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="report-cadence">How often</Label>
                  <Select
                    value={cadence}
                    onValueChange={(next) => setCadence(next as ReportCadence)}
                  >
                    <SelectTrigger id="report-cadence" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {REPORT_CADENCES.map((entry) => (
                        <SelectItem key={entry} value={entry}>
                          {CADENCE_LABELS[entry]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="report-hour">At</Label>
                  <Select
                    value={String(hourOfDay)}
                    onValueChange={(next) => setHourOfDay(Number(next))}
                  >
                    <SelectTrigger id="report-hour" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {HOUR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Only the field the chosen cadence reads, so nothing implies a choice with no effect. */}
              {cadence === "weekly" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="report-weekday">On</Label>
                  <Select
                    value={String(dayOfWeek)}
                    onValueChange={(next) => setDayOfWeek(Number(next))}
                  >
                    <SelectTrigger id="report-weekday" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {WEEKDAY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {cadence === "monthly" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="report-day-of-month">
                    Day of the month (1–{MAX_REPORT_DAY_OF_MONTH})
                  </Label>
                  <Input
                    id="report-day-of-month"
                    type="number"
                    min={1}
                    max={MAX_REPORT_DAY_OF_MONTH}
                    value={dayOfMonth}
                    onChange={(event) => setDayOfMonth(event.target.valueAsNumber)}
                  />
                  {/*
                    Stated rather than silently clamped. "The 31st" either skips
                    February or becomes the 28th for one month a year, and both
                    are a report that did not arrive when somebody was told it
                    would.
                  */}
                  <p className="text-micro text-muted-foreground">
                    The 29th to the 31st are not offered: they do not exist in every month.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="report-recipients">Send to</Label>
                <Input
                  id="report-recipients"
                  placeholder="ops@example.com, finance@example.com"
                  value={recipients}
                  onChange={(event) => setRecipients(event.target.value)}
                />
                <p className="text-micro text-muted-foreground">
                  Each person gets their own copy, so nobody sees who else receives it.
                </p>
              </div>

              <LoadingButton isPending={create.isPending} onClick={handleCreate}>
                Add schedule
              </LoadingButton>

              <p className="text-micro text-muted-foreground">
                It runs with your access to the data. If your permission to read this
                source is withdrawn, the schedule stops rather than sending numbers you
                could no longer see yourself.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </AppSheet>
  );
}

function ScheduleRow({
  schedule,
  canManage,
  isBusy,
  onToggle,
  onDelete,
}: {
  schedule: ReportSchedule;
  canManage: boolean;
  isBusy: boolean;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{describeSchedule(schedule)}</p>
        <p className="truncate text-label text-muted-foreground">
          {schedule.recipients.join(", ")}
        </p>
        <p className="text-micro text-muted-foreground" title={schedule.nextRunAt}>
          {schedule.enabled
            ? `Next ${formatRelativeTime(schedule.nextRunAt)}`
            : "Paused"}
          {schedule.runCount > 0 ? ` · sent ${schedule.runCount} times` : ""}
        </p>
        {/*
          The failure that would otherwise be invisible: a schedule that has
          stopped delivering looks exactly like one nobody set up.
        */}
        {schedule.lastError ? (
          <p role="alert" className="text-label text-status-danger-ink">
            Last run failed: {schedule.lastError}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-gap-inline">
        {canManage ? (
          <>
            <Switch
              checked={schedule.enabled}
              disabled={isBusy}
              onCheckedChange={onToggle}
              aria-label={schedule.enabled ? "Pause this schedule" : "Resume this schedule"}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Remove this schedule"
              disabled={isBusy}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : (
          <Badge variant="outline">{schedule.enabled ? "on" : "paused"}</Badge>
        )}
      </div>
    </div>
  );
}
