"use client";

import Link from "next/link";
import { Mail, Building2, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TruncatedText } from "@/components/ui/truncated-text";
import { HrStatusBadge } from "@/features/hr/shared/hr-ui";
import { resolveImageUrl, cn } from "@/lib/utils";
import type { Employee } from "@/types/hr";

interface EmployeeCardProps {
  employee: Employee;
  department: string | null;
}

export function EmployeeCard({ employee: emp, department }: EmployeeCardProps) {
  const displayName =
    emp.firstName && emp.lastName
      ? `${emp.firstName} ${emp.lastName}`
      : (emp.name ?? "—");
  const initial = (emp.firstName?.[0] ?? emp.name?.[0] ?? "?").toUpperCase();
  const designation = emp.designation?.trim() || null;

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
        <div className="relative p-4 flex flex-col items-center text-center gap-3">
          <Avatar className="h-16 w-16 mt-0.5 ring-2 ring-border shadow-sm transition-transform duration-300 group-hover:scale-105">
            <AvatarImage src={resolveImageUrl(emp.image)} alt="" />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>

          <div className="w-full min-w-0">
            <TruncatedText
              text={displayName}
              className="font-semibold text-sm leading-tight text-foreground"
            />
          </div>

          {(designation || department) && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-full">
              {designation && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border max-w-full">
                  <Briefcase className="h-3 w-3 shrink-0" />
                  <TruncatedText text={designation} className="text-[10px] font-semibold" />
                </span>
              )}
              {department && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/30 max-w-full">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <TruncatedText text={department} className="text-[10px] font-semibold" />
                </span>
              )}
            </div>
          )}

          {emp.email && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground w-full justify-center min-w-0">
              <Mail className="h-3 w-3 shrink-0" />
              <TruncatedText text={emp.email} className="text-[11px] text-muted-foreground" />
            </div>
          )}

          <HrStatusBadge status={emp.isActive ? "active" : "inactive"} />
        </div>
      </article>
    </Link>
  );
}
