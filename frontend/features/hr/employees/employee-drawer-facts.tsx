"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatShortDate } from "@/lib/date-utils";
import type { PersonDrawerException } from "@/components/shared/person-drawer";
import type { EmployeeListItem } from "@/types/hr";

export interface EmployeeEmploymentFacts {
  employeeNumber: string;
  lifecycleStatus: string;
  workerType: string;
  designation: string | null;
  joiningDate: string | null;
  probationEndDate: string | null;
  confirmationDate: string | null;
}

export function employeeDrawerExceptions(
  employee: EmployeeListItem,
  employment: EmployeeEmploymentFacts | null | undefined,
  employmentSettled: boolean,
): PersonDrawerException[] {
  const exceptions: PersonDrawerException[] = [];
  if (employee.isActive && employee.hasAccepted === false) {
    exceptions.push({
      id: "invite",
      label: "Invitation not accepted",
      detail: "Resend or copy the join link",
      href: `/hr/employees/${employee.id}`,
    });
  }
  if (employmentSettled && !employment) {
    exceptions.push({
      id: "no-employment",
      label: "No employment record",
      detail: "Not hired yet",
      href: "/hr/onboarding",
    });
  }
  if (employment?.probationEndDate && !employment.confirmationDate) {
    exceptions.push({
      id: "probation",
      label: "Probation open",
      detail: `Ends ${formatShortDate(employment.probationEndDate)}`,
      href: "/hr/onboarding/probation",
    });
  }
  exceptions.push({
    id: "approvals",
    label: "Open Action Center",
    detail: "Pending leave, WFH and attendance decisions",
    href: "/hr/approvals",
  });
  return exceptions;
}

export function DrawerFactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1.5 last:border-b-0">
      <dt className="text-dense text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-label font-medium text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  );
}

export function DrawerDeepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-label font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {label}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

export function DrawerNotMeasured({ children }: { children: string }) {
  return <p className="text-dense text-muted-foreground">{children}</p>;
}
