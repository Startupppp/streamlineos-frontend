"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EmployeeProjectsList } from "@/components/hr/employee-projects-list";
import { EmployeeTicketsList } from "@/components/hr/employee-tickets-list";
import { DirectReportsSection, ManagerScorecardSection } from "@/features/hr/employees/detail/employee-detail-helpers";
import { Briefcase, FileCheck, Tag } from "lucide-react";

interface OverviewTabProps {
  employeeId: string;
  skillsList: string[];
  projects: Record<string, unknown>[];
  tickets: Parameters<typeof EmployeeTicketsList>[0]["tickets"];
}

export function OverviewTab({ employeeId, skillsList, projects, tickets }: OverviewTabProps) {
  return (
    <div className="space-y-4 pb-4">
      {skillsList.length > 0 && (
        <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                <Tag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Skills &amp; Expertise
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skillsList.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
                >
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ManagerScorecardSection employeeId={employeeId} />

      <DirectReportsSection employeeId={employeeId} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Projects
              </h3>
            </div>
            <EmployeeProjectsList
              projects={projects.map((p) => ({
                id: Number(p["id"]),
                name: String(p["name"] ?? ""),
                role: p["role"] != null ? String(p["role"]) : null,
                description: p["description"] != null ? String(p["description"]) : null,
                stats: p["stats"] != null
                  ? {
                      todo: Number((p["stats"] as Record<string, unknown>)["todo"] ?? 0),
                      inProgress: Number((p["stats"] as Record<string, unknown>)["inProgress"] ?? 0),
                      done: Number((p["stats"] as Record<string, unknown>)["done"] ?? 0),
                    }
                  : undefined,
              }))}
            />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <FileCheck className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Assigned Tickets
              </h3>
            </div>
            <EmployeeTicketsList tickets={tickets} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
