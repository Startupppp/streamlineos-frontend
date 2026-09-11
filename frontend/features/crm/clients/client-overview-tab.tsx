"use client";

import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordDetail } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { CLIENT_LAYOUT } from "@/lib/renderer/crm/client-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { ActivityItem } from "./activity-item";
import { clientRecord } from "./client-record";
import type { ClientAccountWithActivities } from "@/types/crm";

/**
 * One client, rendered from the same description that produced the list.
 *
 * The two hand-written definition lists this replaces held their own labels,
 * their own renewal-stage map and their own INR-hardcoded money formatter — so a
 * client's amounts showed rupees to every tenant regardless of the currency the
 * organisation actually works in. The layout's `money` fields render through
 * `useOrgDisplay`, which is what fixed that.
 */
export function ClientOverviewTab({ client }: { client: ClientAccountWithActivities }) {
  const layout = useTenantLayout(CLIENT_LAYOUT);
  const money = useOrgDisplay();
  const recentActivities = client.activities.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <RecordDetail layout={layout} record={clientRecord(client)} money={money} showTitle={false} />

      {recentActivities.length > 0 ? (
        <Card className="self-start shadow-sm">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            {recentActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
