"use client";

import Link from "next/link";
import { Mail, Building2, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TruncatedText } from "@/components/ui/truncated-text";
import { resolveImageUrl, cn } from "@/lib/utils";
import type { Employee } from "@/types/hr";

interface EmployeeCardProps {
  employee: Employee;
  department: string | null;
}

function employeeDisplayName(emp: Employee): string {
  if (emp.firstName && emp.lastName) return `${emp.firstName} ${emp.lastName}`;
  return emp.name?.trim() || "—";
}

function employeeInitials(emp: Employee): string {
  const first = emp.firstName?.trim()?.[0];
  const last = emp.lastName?.trim()?.[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  const fromName = emp.name?.trim()?.[0];
  return (fromName ?? "?").toUpperCase();
}

export function EmployeeCard({ employee: emp, department }: EmployeeCardProps) {
  const displayName = employeeDisplayName(emp);
  const initials = employeeInitials(emp);
  const designation = emp.designation?.trim() || null;
  const employeeId = emp.employeeId?.trim() || null;
  const isActive = emp.isActive;

  return (
    <Link
      href={`/hr/employees/${emp.id}`}
      className="group block h-full min-h-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card",
          "shadow-sm transition-[border-color,box-shadow,transform] duration-200 ease-out",
          "group-hover:-translate-y-0.5 group-hover:border-primary/25",
          "group-hover:shadow-[0_10px_24px_-14px_rgba(15,23,42,0.45)]",
        )}
      >
        <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-3.5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border/60 sm:h-11 sm:w-11">
              <AvatarImage src={resolveImageUrl(emp.image)} alt="" />
              <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary sm:text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <TruncatedText
                text={displayName}
                className="block w-full text-sm font-semibold leading-5 text-foreground"
              />
              <div className="mt-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    isActive
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                  title={isActive ? "Active" : "Inactive"}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isActive ? "bg-emerald-500" : "bg-muted-foreground/60",
                    )}
                  />
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {designation ? (
                <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground sm:mt-1.5">
                  <Briefcase className="h-3 w-3 shrink-0 opacity-60" />
                  <TruncatedText text={designation} className="text-xs text-muted-foreground" />
                </div>
              ) : null}

              {(department || employeeId) && (
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground sm:mt-1.5">
                  {department ? (
                    <span className="inline-flex min-w-0 max-w-[65%] items-center gap-1">
                      <Building2 className="h-3 w-3 shrink-0 opacity-60" />
                      <TruncatedText text={department} className="text-[11px]" />
                    </span>
                  ) : null}
                  {department && employeeId ? (
                    <span className="text-border" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  {employeeId ? (
                    <TruncatedText
                      text={employeeId}
                      className="font-mono text-[11px] text-muted-foreground"
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {emp.email ? (
            <div className="mt-auto flex min-w-0 items-center gap-1.5 border-t border-border/50 pt-2 sm:pt-2.5">
              <Mail className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              <TruncatedText
                text={emp.email}
                className="text-[11px] text-muted-foreground"
              />
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
