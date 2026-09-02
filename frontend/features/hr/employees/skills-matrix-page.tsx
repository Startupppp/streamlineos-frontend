"use client";

import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useSkillsMatrix } from "@/hooks/api/hr";
import { useCan } from "@/hooks/api/access";
import { getInitials } from "@/lib/format-utils";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { LayoutGrid, Table2 } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-primary/10 text-primary",
  3: "bg-status-warning-surface text-status-warning-ink",
  4: "bg-status-success-surface text-status-success-ink",
  5: "bg-status-info-surface text-status-info-ink",
};

const LEVEL_SHORT: Record<number, string> = { 1: "B", 2: "E", 3: "I", 4: "A", 5: "X" };
const LEVEL_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Elementary",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

export function SkillsMatrixPage() {
  const canReadEmployees = useCan("hr:employees:view");
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([
    undefined,
  ]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading, isFetching, isError, refetch } = useSkillsMatrix({
    cursor: cursorHistory[page - 1],
    limit: pageSize,
    enabled: canReadEmployees,
  });
  const [compact, setCompact] = useState(false);

  const toggleCompact = useCallback(
    () => setCompact((currentCompact) => !currentCompact),
    [],
  );
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handlePreviousPage = useCallback(() => {
    setPage((currentPage) => Math.max(1, currentPage - 1));
  }, []);
  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pageInfo.nextCursor;
    if (!nextCursor) return;
    setCursorHistory((currentHistory) => {
      const retainedHistory = currentHistory.slice(0, page);
      retainedHistory[page] = nextCursor;
      return retainedHistory;
    });
    setPage((currentPage) => currentPage + 1);
  }, [data?.pageInfo.nextCursor, page]);
  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setCursorHistory([undefined]);
    setPage(1);
  }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Skills Matrix" subtitle="Cross-reference of employees and their skill levels across the org">
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex border-b bg-muted/40 px-3 py-2 gap-4">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 10 }).map((_, columnSkeletonIndex) => (
              <Skeleton key={columnSkeletonIndex} className="h-4 w-16" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, rowSkeletonIndex) => (
            <div key={rowSkeletonIndex} className="flex items-center border-b last:border-0 px-3 py-2.5 gap-4">
              <div className="flex items-center gap-2 w-40 shrink-0">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              {Array.from({ length: 10 }).map((_, cellSkeletonIndex) => (
                <Skeleton key={cellSkeletonIndex} className="h-5 w-16 rounded" />
              ))}
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Skills Matrix" subtitle="Cross-reference of employees and their skill levels across the org">
        <ErrorState
          title="Failed to load skills matrix"
          description="Something went wrong. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  const employees = data?.employees ?? [];
  const skills = data?.skills ?? [];

  return (
    <PageWrapper
      title="Skills Matrix"
      subtitle="Cross-reference of employees and their skill levels across the org"
      actions={
        employees.length > 0 && skills.length > 0 ? (
          <Button size="sm" variant="outline" onClick={toggleCompact}>
            {compact ? <Table2 className="h-3.5 w-3.5 mr-1.5" /> : <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />}
            {compact ? "Full View" : "Compact View"}
          </Button>
        ) : undefined
      }
    >
      {employees.length === 0 || skills.length === 0 ? (
        <EmptyState
          illustration={<EmptyTeamIllustration className="h-40 w-40 opacity-95" />}
          title="No skills data yet"
          description="Add skills to employee profiles to see the matrix here."
        />
      ) : (
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card border-b border-r border-border px-3 py-2 text-left font-medium min-w-[160px]">
                    Employee
                  </th>
                  {skills.map((skill) => (
                    <th
                      key={skill}
                      className={`border-b border-r px-2 py-2 font-medium text-center ${compact ? "max-w-[50px]" : "max-w-[90px]"} truncate`}
                      title={skill}
                    >
                      {compact ? (
                        <span className="block truncate text-micro leading-tight">{skill.substring(0, 6)}{skill.length > 6 ? "…" : ""}</span>
                      ) : (
                        <div className="[writing-mode:vertical-rl] rotate-180 max-h-24 py-1">{skill}</div>
                      )}
                    </th>
                  ))}
                  <th className="border-b px-2 py-2 font-medium text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employeeRecord) => {
                  const skillCount = Object.keys(employeeRecord.skills).length;
                  return (
                    <tr key={employeeRecord.userId} className="hover:bg-muted/30">
                      <td className="sticky left-0 z-10 bg-card border-b border-r border-border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={employeeRecord.image ?? undefined} />
                            <AvatarFallback className="text-micro">{getInitials(employeeRecord.name)}</AvatarFallback>
                          </Avatar>
                          <TruncatedText text={employeeRecord.name ?? ""} className="font-medium max-w-[110px]" />
                        </div>
                      </td>
                      {skills.map((skill) => {
                        const level = employeeRecord.skills[skill];
                        return (
                          <td key={skill} className="border-b border-r px-1 py-1 text-center">
                            {level ? (
                              <span
                                title={`${skill}: ${LEVEL_LABELS[level] ?? `L${level}`}`}
                                className={`inline-block rounded px-1.5 py-0.5 text-micro font-semibold cursor-default ${LEVEL_COLORS[level] ?? LEVEL_COLORS[1]}`}
                              >
                                {compact ? (LEVEL_SHORT[level] ?? `${level}`) : `${level} – ${LEVEL_LABELS[level] ?? `L${level}`}`}
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

            <div className="flex items-center gap-4 mt-4 px-1 flex-wrap">
              {Object.entries(LEVEL_LABELS).map(([levelNumber, levelLabel]) => (
                <div key={levelNumber} className="flex items-center gap-1.5">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-micro font-semibold ${LEVEL_COLORS[Number(levelNumber)]}`}>
                    {levelNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">{levelNumber} - {levelLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}

      {(page > 1 || data?.pageInfo.hasMore) && (
        <CursorPageControls
          page={page}
          hasNext={data?.pageInfo.hasMore ?? false}
          disabled={isFetching}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[10, 20, 50]}
          className="mt-4"
        />
      )}
    </PageWrapper>
  );
}
