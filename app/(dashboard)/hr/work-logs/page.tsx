"use client";

import { useState, useMemo } from "react";
import { format, eachDayOfInterval, isWeekend, getMonth } from "date-fns";
import { useGetWorkLogs, useUpsertWorkLog } from "../../../../lib/hooks/trpc-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Textarea } from "../../../../components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "../../../../components/ui/button";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../../../lib/utils";

export default function WorkLogsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<number>(currentQuarter);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };

  const { data: logs, isLoading } = useGetWorkLogs({
    year,
    quarter,
  });

  const upsertLog = useUpsertWorkLog({
    onSuccess: () => {
      // creating a log doesn't change other logs, but invalidating ensures consistency
      // refetch(); // Optional, might be jarring if re-rendering. 
      // We will rely on local state for smoothness.
      toast.success("Saved");
    },
    onError: () => {
      toast.error("Failed to save log");
    }
  });

  const days = useMemo(() => {
    const startMonthIndex = (quarter - 1) * 3;
    const startDate = new Date(year, startMonthIndex, 1);
    const endDate = new Date(year, startMonthIndex + 3, 0);

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [year, quarter]);

  // Group days by month
  const monthGroups = useMemo(() => {
    const groups: { monthKey: string; label: string; days: Date[] }[] = [];
    let currentGroup: typeof groups[number] | null = null;

    for (const date of days) {
      const monthKey = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy");
      if (!currentGroup || currentGroup.monthKey !== monthKey) {
        currentGroup = { monthKey, label, days: [] };
        groups.push(currentGroup);
      }
      currentGroup.days.push(date);
    }
    return groups;
  }, [days]);

  // Count filled logs per month
  const filledCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!logs) return counts;
    for (const group of monthGroups) {
      counts[group.monthKey] = group.days.filter((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        return logs.some((l) => l.date === dateStr && l.description);
      }).length;
    }
    return counts;
  }, [logs, monthGroups]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Logs"
        description="Track your daily tasks and activities."
        actions={
          <div className="flex gap-2">
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1 (Jan - Mar)</SelectItem>
                <SelectItem value="2">Q2 (Apr - Jun)</SelectItem>
                <SelectItem value="3">Q3 (Jul - Sep)</SelectItem>
                <SelectItem value="4">Q4 (Oct - Dec)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {monthGroups.map((group) => {
            const isCollapsed = collapsedMonths.has(group.monthKey);
            const filled = filledCounts[group.monthKey] || 0;
            const weekdays = group.days.filter((d) => !isWeekend(d)).length;

            return (
              <Card key={group.monthKey}>
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleMonth(group.monthKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-lg">{group.label}</CardTitle>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {filled}/{weekdays} weekdays logged
                    </span>
                  </div>
                </CardHeader>
                {!isCollapsed && (
                  <CardContent>
                    <div className="space-y-4">
                      {group.days.map((date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const log = logs?.find((l) => l.date === dateStr);
                        return (
                          <DayLogEntry
                            key={dateStr}
                            date={date}
                            initialContent={log?.description || ""}
                            onSave={(content) => upsertLog.mutate({ date, description: content })}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DayLogEntry({ date, initialContent, onSave }: { date: Date, initialContent: string, onSave: (c: string) => void }) {
  const [content, setContent] = useState(initialContent);
  const [prevInitial, setPrevInitial] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  
  if (initialContent !== prevInitial) {
    setPrevInitial(initialContent);
    if (!isDirty) {
      setContent(initialContent);
    }
  }

  const handleBlur = () => {
    if (content !== initialContent) {
      onSave(content);
      // We don't reset dirty here immediately, we wait for re-render or assume saved.
      // Actually, simplest is just optimistic.
    }
  };

  const isWeekendDay = isWeekend(date);

  return (
    <div className={cn(
        "flex gap-4 p-4 rounded-lg border transition-colors",
        isWeekendDay ? "bg-slate-50/50" : "bg-card",
        content ? "border-l-4 border-l-green-500" : "border-l-4 border-l-slate-200"
    )}>
       <div className="w-32 flex-shrink-0 pt-2">
          <div className="font-bold text-lg">{format(date, "dd")}</div>
          <div className="text-muted-foreground text-sm uppercase">{format(date, "MMM, EEE")}</div>
          {isWeekendDay && <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 mt-1 inline-block">Weekend</span>}
       </div>
       
       <div className="flex-1">
          <Textarea 
            value={content}
            onChange={(e) => {
               setContent(e.target.value);
               setIsDirty(true);
            }}
            onBlur={handleBlur}
            placeholder={isWeekendDay ? "Weekend..." : "What did you work on today?"}
            className={cn(
              "resize-none min-h-[0] focus-visible:ring-1 focus-visible:ring-offset-0",
               isWeekendDay && !content ? "h-10 opacity-50" : "h-24"
            )}
          />
       </div>
    </div>
  );
}
