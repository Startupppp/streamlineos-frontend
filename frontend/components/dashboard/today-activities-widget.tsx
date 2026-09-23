"use client";

import { useCanState } from "@/hooks/api/access";
import { useTodayActivities } from "@/hooks/api/dashboard";
import { WidgetCard } from "@/components/ui/widget-card";
import { NoPermissionState } from "@/components/shared";
import { Activity } from "lucide-react";

export function TodayActivitiesWidget() {
  const canViewState = useCanState("crm:leads:view");
  const { data, isLoading, error, refetch } = useTodayActivities();

  const handleRetry = () => void refetch();

  if (canViewState === "denied") {
    return (
      <WidgetCard icon={Activity} title="Today's Activities">
        <NoPermissionState permission="crm:leads:view" compact />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={Activity}
      title="Today's Activities"
      link={{ href: "/crm/leads", label: "View leads", ariaLabel: "View CRM leads" }}
      isLoading={canViewState === "loading" || isLoading}
      error={error}
      onRetry={handleRetry}
      loadingRows={3}
      isEmpty={!isLoading && !error && (!data || data.length === 0)}
      empty={
        <p className="py-4 text-center text-sm text-muted-foreground">
          No activities scheduled for today.
        </p>
      }
    >
      <ul className="space-y-2">
        {data?.map((activity, i) => {
          const key = `${i}-${activity.type ?? ""}-${String(activity.subject ?? "").slice(0, 20)}`;
          return (
            <li key={key} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {activity.subject ?? "Untitled"}
                </span>
                {activity.type && (
                  <span className="text-xs text-muted-foreground">{activity.type}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}
