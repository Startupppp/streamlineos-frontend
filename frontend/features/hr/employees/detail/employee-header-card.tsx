"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AvailabilityBadge, InfoField, StatBlock } from "@/features/hr/employees/detail/employee-detail-helpers";
import { LIFECYCLE_BADGE } from "@/features/hr/employees/detail/employee-detail-constants";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { getUserDisplayName } from "@/lib/person-display";
import { format } from "date-fns";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Mail,
  MailQuestion,
  Phone,
  Tag,
  XCircle,
} from "lucide-react";
import type { EmployeeData } from "@/features/hr/employees/detail/edit-employee-form";
import { ResendInviteButton } from "@/components/hr/resend-invite-button";
import { CopyInviteLinkButton } from "@/components/hr/copy-invite-link-button";
import {
  InviteDeliveryBadge,
  InviteDeliveryNote,
} from "@/features/hr/employees/detail/invite-delivery-badge";

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
  // V-023/V-025: one name, from one place. Composing first+last here ignored
  // `employee.name`, so a person carrying only a display name read "Employee"
  // and an owner read their email local part.
  const employeeName = getUserDisplayName(employee);

  const lifecycleBadge = lifecycleStatus
    ? LIFECYCLE_BADGE[lifecycleStatus] ?? {
        label: lifecycleStatus,
        className: "bg-muted text-muted-foreground border-border",
      }
    : null;

  return (
    <Card
      className={cn(
        "shrink-0 overflow-hidden rounded-2xl border border-border/70 border-l-4 bg-card/90 shadow-card backdrop-blur-sm",
        isAlreadyTerminated ? "border-l-rose-500" : "border-l-emerald-500",
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
          <div className="min-w-0 flex-1 space-y-3.5">
            {/* V-023: one heading, not a mobile copy and a desktop copy. */}
            <div className="flex items-start gap-3">
              <Avatar className="h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                <AvatarImage
                  src={resolveImageUrl(
                    typeof employee.image === "string" ? employee.image : null,
                  )}
                />
                <AvatarFallback className="bg-muted text-lg font-bold text-muted-foreground sm:text-xl">
                  {getInitials(undefined, employee.firstName, employee.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold leading-tight text-foreground sm:text-lg">
                  {employeeName}
                </h2>
                {employee.designation && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {employee.designation}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {lifecycleBadge && !isAlreadyTerminated && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-semibold",
                    lifecycleBadge.className,
                  )}
                >
                  <Tag className="h-3 w-3" />
                  {lifecycleBadge.label}
                </span>
              )}
              {employeeNumber && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-micro font-semibold text-muted-foreground">
                  {employeeNumber}
                </span>
              )}
              {workerType && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-micro font-semibold text-muted-foreground">
                  {workerType.replaceAll("_", " ")}
                </span>
              )}
              {isAlreadyTerminated ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-status-danger-rule bg-status-danger-surface px-2 py-0.5 text-micro font-semibold text-status-danger-ink">
                  <XCircle className="h-3 w-3" />
                  Terminated
                </span>
              ) : employee.hasAccepted === false ? (
                // PROVISIONAL (product default E-4): the account flag is set at
                // creation, so an invitee who never accepted must not read
                // "Active" here while the directory counts them "Pending invite".
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-status-warning-rule bg-status-warning-surface px-2 py-0.5 text-micro font-semibold text-status-warning-ink"
                  title="Invited, not yet accepted"
                >
                  <MailQuestion className="h-3 w-3" />
                  Pending
                </span>
              ) : showEmploymentActiveBadge ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-status-success-rule bg-status-success-surface px-2 py-0.5 text-micro font-semibold text-status-success-ink">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              ) : null}
              {employee.role && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-micro font-semibold text-muted-foreground">
                  {employee.role}
                </span>
              )}
              {showLegacyEmployeeId && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-micro font-semibold text-muted-foreground">
                  ID: {legacyEmployeeId}
                </span>
              )}
              <AvailabilityBadge userId={employee.id} />
              {!isSelf && <InviteDeliveryBadge delivery={employee.inviteDelivery} />}
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

            {!isSelf && !isAlreadyTerminated && (
              // Two ways in, beside each other. Resend is the ordinary one;
              // Copy invite link is what keeps onboarding moving when email
              // delivery is unconfigured or silently dropping, which is the
              // state the audited environment was in.
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <ResendInviteButton employeeId={employee.id} employeeName={employeeName} />
                  <CopyInviteLinkButton employeeId={employee.id} employeeName={employeeName} />
                </div>
                {/* HRMS-E2E-018. Beside the two buttons, because the whole reason
                    an administrator reads the status is to decide between them. */}
                <InviteDeliveryNote delivery={employee.inviteDelivery} />
              </div>
            )}

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
                  <span className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
                    Profile Completeness
                  </span>
                  <span className="text-dense font-bold tabular-nums text-foreground">
                    {completeness}%
                  </span>
                </div>
                <Progress value={completeness} className="h-1.5" />
                <p className="text-dense leading-relaxed text-muted-foreground">
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
                colorClass="text-status-success-ink"
              />
              <StatBlock
                label="Leaves"
                value={stats.leaves.total}
                colorClass="text-primary"
              />
              <StatBlock
                label="Pending"
                value={stats.leaves.pending}
                colorClass="text-status-warning-ink"
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
