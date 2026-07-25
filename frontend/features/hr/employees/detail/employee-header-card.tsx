"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AvailabilityBadge, InfoField, StatBlock } from "@/features/hr/employees/detail/employee-detail-helpers";
import { getInitials, LIFECYCLE_BADGE } from "@/features/hr/employees/detail/employee-detail-constants";
import { cn, resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Mail,
  Phone,
  Tag,
  XCircle,
} from "lucide-react";
import type { EmployeeData } from "@/features/hr/employees/detail/edit-employee-form";

interface EmployeeStats {
  attendance?: { daysPresent?: number } | null;
  leaves: { total: number; pending: number };
}

interface EmployeeHeaderCardProps {
  employee: EmployeeData;
  stats: EmployeeStats | null | undefined;
  statsLoading: boolean;
  isSelf: boolean;
  completeness: number;
  missingFields: string[];
  lifecycleStatus: string | null;
  employeeNumber: string | null;
  workerType: string | null;
  isAlreadyTerminated: boolean;
  showEmploymentActiveBadge: boolean;
  showLegacyEmployeeId: boolean;
  legacyEmployeeId: string;
}

export function EmployeeHeaderCard({
  employee,
  stats,
  statsLoading,
  isSelf,
  completeness,
  missingFields,
  lifecycleStatus,
  employeeNumber,
  workerType,
  isAlreadyTerminated,
  showEmploymentActiveBadge,
  showLegacyEmployeeId,
  legacyEmployeeId,
}: EmployeeHeaderCardProps) {
  const employeeName =
    `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Employee";

  const lifecycleBadge = lifecycleStatus
    ? LIFECYCLE_BADGE[lifecycleStatus] ?? {
        label: lifecycleStatus,
        className: "bg-muted text-muted-foreground border-border",
      }
    : null;

  return (
    <Card
      className={cn(
        "shrink-0 overflow-hidden rounded-2xl border border-border/70 border-l-4 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] backdrop-blur-sm",
        isAlreadyTerminated ? "border-l-rose-500" : "border-l-emerald-500",
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
          <div className="flex items-start gap-3 sm:block sm:shrink-0">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage
                src={resolveImageUrl(
                  typeof employee.image === "string" ? employee.image : null,
                )}
              />
              <AvatarFallback className="bg-muted text-lg font-bold text-muted-foreground sm:text-xl">
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 sm:hidden">
              <h2 className="text-base font-bold leading-tight text-foreground">
                {employeeName}
              </h2>
              {employee.designation && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {employee.designation}
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3.5">
            <div className="hidden items-start gap-2 sm:flex">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-foreground">
                  {employeeName}
                </h2>
                {employee.designation && (
                  <p className="text-sm text-muted-foreground">
                    {employee.designation}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {lifecycleBadge && !isAlreadyTerminated && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    lifecycleBadge.className,
                  )}
                >
                  <Tag className="h-3 w-3" />
                  {lifecycleBadge.label}
                </span>
              )}
              {employeeNumber && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                  {employeeNumber}
                </span>
              )}
              {workerType && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {workerType.replaceAll("_", " ")}
                </span>
              )}
              {isAlreadyTerminated ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  <XCircle className="h-3 w-3" />
                  Terminated
                </span>
              ) : showEmploymentActiveBadge ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : null}
              {employee.role && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {employee.role}
                </span>
              )}
              {showLegacyEmployeeId && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  ID: {legacyEmployeeId}
                </span>
              )}
              <AvailabilityBadge userId={employee.id} />
            </div>

            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-2.5">
              <InfoField icon={Mail} label="Email" value={employee.email} />
              <InfoField icon={Phone} label="Phone" value={employee.phone} />
              <InfoField
                icon={Building2}
                label="Department"
                value={
                  typeof employee.departmentName === "string"
                    ? employee.departmentName
                    : null
                }
              />
              <InfoField
                icon={Calendar}
                label="Joined"
                value={
                  employee.joiningDate
                    ? format(new Date(String(employee.joiningDate)), "MMM yyyy")
                    : null
                }
              />
            </div>

            {typeof employee.bio === "string" && employee.bio && (
              <TruncatedText
                text={employee.bio}
                lines={2}
                className="text-sm text-muted-foreground"
              />
            )}

            {isSelf && completeness < 100 && (
              <div className="space-y-2 border-t border-border/60 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Profile Completeness
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-foreground">
                    {completeness}%
                  </span>
                </div>
                <Progress value={completeness} className="h-1.5" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Missing: {missingFields.slice(0, 3).join(", ")}
                  {missingFields.length > 3
                    ? ` +${missingFields.length - 3} more`
                    : ""}
                </p>
              </div>
            )}
          </div>

          {!statsLoading && stats && (
            <div className="flex items-center divide-x divide-border rounded-xl border border-border/60 bg-muted/20 py-3 sm:shrink-0 sm:border-0 sm:border-l sm:border-border sm:bg-transparent sm:py-0 sm:pl-5 sm:rounded-none">
              <StatBlock
                label="Present"
                value={stats.attendance?.daysPresent ?? 0}
                colorClass="text-emerald-700 dark:text-emerald-300"
              />
              <StatBlock
                label="Leaves"
                value={stats.leaves.total}
                colorClass="text-primary"
              />
              <StatBlock
                label="Pending"
                value={stats.leaves.pending}
                colorClass="text-amber-700 dark:text-amber-300"
              />
            </div>
          )}
          {statsLoading && (
            <div className="flex items-center divide-x divide-border rounded-xl border border-border/60 bg-muted/20 py-3 sm:shrink-0 sm:border-0 sm:border-l sm:border-border sm:bg-transparent sm:py-0 sm:pl-5 sm:rounded-none">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-1 space-y-1.5 px-3 text-center sm:px-4">
                  <Skeleton className="mx-auto h-8 w-10 sm:h-10" />
                  <Skeleton className="mx-auto h-3 w-12" />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
