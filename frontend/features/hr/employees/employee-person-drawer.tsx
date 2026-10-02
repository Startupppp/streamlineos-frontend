"use client";

import { useMemo } from "react";
import {
  PersonDrawer,
  type PersonSummary,
} from "@/components/shared/person-drawer";
import { useCan } from "@/hooks/api/access";
import { useEmployeeEmployment } from "@/hooks/api/hr/employee-profile";
import { formatShortDate } from "@/lib/date-utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DrawerDeepLink,
  DrawerFactRow,
  DrawerNotMeasured,
  employeeDrawerExceptions,
} from "@/features/hr/employees/employee-drawer-facts";
import type { EmployeeListItem } from "@/types/hr";

interface EmployeePersonDrawerProps {
  employee: EmployeeListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeePersonDrawer({
  employee,
  open,
  onOpenChange,
}: EmployeePersonDrawerProps) {
  const canSeePay = useCan("payroll:salaries:view");
  const employment = useEmployeeEmployment(open && employee ? employee.id : "");

  const person = useMemo<PersonSummary | null>(
    () =>
      employee
        ? {
            userId: employee.id,
            name: employee.name,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            image: employee.image,
            employeeId: employee.employeeId,
            designation: employee.designation,
            departmentName: employee.department?.name ?? null,
            isActive: employee.isActive,
            hasAccepted: employee.hasAccepted,
            reportingToName: employee.reportingTo,
          }
        : null,
    [employee],
  );

  if (!employee || !person) return null;

  const record = employment.data ?? null;
  const employmentSettled = !employment.isLoading && !employment.isFetching;
  const profileHref = `/hr/employees/${employee.id}`;

  return (
    <PersonDrawer
      open={open}
      onOpenChange={onOpenChange}
      person={person}
      profileHref={profileHref}
      canSeePay={canSeePay}
      exceptions={employeeDrawerExceptions(employee, record, employmentSettled)}
      sections={{
        overview: (
          <dl className="flex flex-col">
            <DrawerFactRow label="Work email" value={employee.email || "—"} />
            <DrawerFactRow
              label="Joined"
              value={employee.joiningDate ? formatShortDate(employee.joiningDate) : "—"}
            />
            <DrawerFactRow
              label="Probation ends"
              value={
                record?.probationEndDate
                  ? formatShortDate(record.probationEndDate)
                  : record?.confirmationDate
                    ? "Confirmed"
                    : "—"
              }
            />
            <DrawerFactRow label="Department" value={employee.department?.name ?? "—"} />
          </dl>
        ),
        employment: employment.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : record ? (
          <div className="flex flex-col gap-3">
            <dl className="flex flex-col">
              <DrawerFactRow label="Employee number" value={record.employeeNumber} />
              <DrawerFactRow label="Lifecycle status" value={record.lifecycleStatus} />
              <DrawerFactRow label="Worker type" value={record.workerType} />
              <DrawerFactRow label="Designation" value={record.designation ?? "—"} />
              <DrawerFactRow
                label="Joining date"
                value={record.joiningDate ? formatShortDate(record.joiningDate) : "—"}
              />
              <DrawerFactRow
                label="Confirmed"
                value={
                  record.confirmationDate ? formatShortDate(record.confirmationDate) : "Not yet"
                }
              />
            </dl>
            <DrawerDeepLink href={profileHref} label="Membership, worker and modules" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <DrawerNotMeasured>
              No employment record yet — this person has not been hired into an employment.
            </DrawerNotMeasured>
            <DrawerDeepLink href="/hr/onboarding" label="Open onboarding" />
          </div>
        ),
        time: (
          <div className="flex flex-col gap-2">
            <DrawerNotMeasured>
              Attendance and leave for one person are not summarised here. Open Time for the
              scoped read.
            </DrawerNotMeasured>
            <DrawerDeepLink href="/hr/attendance" label="Open attendance" />
            <DrawerDeepLink href="/hr/leaves" label="Open leave" />
          </div>
        ),
        pay: (
          <div className="flex flex-col gap-2">
            <DrawerNotMeasured>
              Pay is held on the full profile, where every read is audited.
            </DrawerNotMeasured>
            <DrawerDeepLink href={profileHref} label="Open pay on the profile" />
          </div>
        ),
        docs: (
          <div className="flex flex-col gap-2">
            <DrawerNotMeasured>Documents live in the person&apos;s vault.</DrawerNotMeasured>
            <DrawerDeepLink href={profileHref} label="Open documents" />
          </div>
        ),
      }}
    />
  );
}
