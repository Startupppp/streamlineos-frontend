"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSkillsMatrix } from "@/lib/api/hooks/hr";
import { Grid3X3 } from "lucide-react";

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  2: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  3: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  4: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  5: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const LEVEL_LABELS: Record<number, string> = { 1: "L1", 2: "L2", 3: "L3", 4: "L4", 5: "L5" };

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

export default function SkillsMatrixPage() {
  const { data, isLoading } = useSkillsMatrix();

  if (isLoading) {
    return (
      <PageWrapper title="Skills Matrix">
        <Skeleton className="h-96 rounded-lg" />
      </PageWrapper>
    );
  }

  const employees = data?.employees ?? [];
  const skills = data?.skills ?? [];

  return (
    <PageWrapper
      title="Skills Matrix"
      subtitle="Cross-reference of employees and their skill levels across the org"
    >
      {employees.length === 0 || skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-muted-foreground">
          <Grid3X3 className="h-10 w-10 opacity-30" />
          <p>No skills data yet. Add skills to employee profiles.</p>
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2 text-left font-medium min-w-[160px]">
                    Employee
                  </th>
                  {skills.map((skill) => (
                    <th
                      key={skill}
                      className="border-b border-r px-2 py-2 font-medium text-center max-w-[90px] truncate"
                      title={skill}
                    >
                      <div className="[writing-mode:vertical-rl] rotate-180 max-h-24 py-1">{skill}</div>
                    </th>
                  ))}
                  <th className="border-b px-2 py-2 font-medium text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const skillCount = Object.keys(emp.skills).length;
                  return (
                    <tr key={emp.userId} className="hover:bg-muted/30">
                      <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={emp.image ?? undefined} />
                            <AvatarFallback className="text-[9px]">{getInitials(emp.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate max-w-[110px]">{emp.name}</span>
                        </div>
                      </td>
                      {skills.map((skill) => {
                        const level = emp.skills[skill];
                        return (
                          <td key={skill} className="border-b border-r px-1 py-1 text-center">
                            {level ? (
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_COLORS[level] ?? LEVEL_COLORS[1]}`}
                              >
                                {LEVEL_LABELS[level] ?? `L${level}`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border-b px-2 py-2 text-center font-medium">{skillCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-4 px-1 flex-wrap">
              {Object.entries(LEVEL_LABELS).map(([lvl, lbl]) => (
                <div key={lvl} className="flex items-center gap-1">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_COLORS[Number(lvl)]}`}>
                    {lbl}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lvl === "1" ? "Beginner" : lvl === "2" ? "Basic" : lvl === "3" ? "Intermediate" : lvl === "4" ? "Advanced" : "Expert"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}
    </PageWrapper>
  );
}
