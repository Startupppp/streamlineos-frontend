"use client";

import Link from "next/link";
import { Mail, Building2, ArrowUpRight, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl, cn } from "@/lib/utils";
import { HrStatusBadge } from "@/features/hr/shared/hr-ui";
import { ROLE_LABELS } from "@/features/hr/employees/hr-types";
import type { Employee } from "@/types/hr";

interface EmployeeCardProps {
  employee: Employee;
  department: string | null;
}

function formatRoleLabel(role: string | null | undefined): string | null {
  if (!role?.trim()) return null;
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EmployeeCard({ employee: emp, department }: EmployeeCardProps) {
  const displayName =
    emp.firstName && emp.lastName
      ? `${emp.firstName} ${emp.lastName}`
      : (emp.name ?? "—");
  const initial = (emp.firstName?.[0] ?? emp.name?.[0] ?? "?").toUpperCase();
  const roleLabel = formatRoleLabel(emp.role);

  return (
    <Link
      href={`/hr/employees/${emp.id}`}
      className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
    >
      <article
        className={cn(
          "relative h-full overflow-hidden rounded-2xl border border-border/70 bg-card",
          "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-16px_rgba(15,23,42,0.18)]",
          "transition-all duration-300",
          "group-hover:-translate-y-1 group-hover:shadow-[0_16px_36px_-18px_rgba(37,99,235,0.35)]",
          "group-hover:border-blue-500/25",
        )}
      >
        {/* Accent rail */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-1",
            emp.isActive
              ? "bg-gradient-to-b from-emerald-400 to-teal-500"
              : "bg-slate-300 dark:bg-slate-600",
          )}
        />

        {/* Soft hover wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-sky-400/[0.06]"
        />

        <div className="relative p-4 flex flex-col items-center text-center gap-3">
          <div className="relative">
            <Avatar className="h-16 w-16 mt-0.5 ring-2 ring-background shadow-md transition-transform duration-300 group-hover:scale-105">
              <AvatarImage src={resolveImageUrl(emp.image)} alt="" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500/15 to-sky-400/20 text-blue-700 dark:text-blue-300 text-lg font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-card",
                emp.isActive ? "bg-emerald-500" : "bg-slate-400",
              )}
              title={emp.isActive ? "Active" : "Inactive"}
            />
          </div>

          <div className="w-full space-y-0.5 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate text-foreground flex items-center justify-center gap-1">
              <span className="truncate">{displayName}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
            </p>
            {emp.designation && (
              <p className="text-[11px] text-muted-foreground truncate">{emp.designation}</p>
            )}
          </div>

          {(roleLabel || department) && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-full">
              {roleLabel && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border max-w-full">
                  <Briefcase className="h-3 w-3 shrink-0" />
                  <span className="truncate">{roleLabel}</span>
                </span>
              )}
              {department && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-800/50 max-w-full">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{department}</span>
                </span>
              )}
            </div>
          )}

          {emp.email && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground w-full justify-center min-w-0">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{emp.email}</span>
            </div>
          )}

          <HrStatusBadge status={emp.isActive ? "active" : "inactive"} />
        </div>
      </article>
    </Link>
  );
}
