import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SlaAlertResponse } from "@/types/leads";

interface SlaAlertCardProps {
  slaData: SlaAlertResponse;
}

export function SlaAlertCard({ slaData }: SlaAlertCardProps) {
  return (
    <Card className="border-red-500/20 bg-red-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-4 w-4" />
          SLA Breached — {slaData.total} leads not contacted in 24h+
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[160px] overflow-y-auto">
          {slaData.leads.slice(0, 8).map((lead) => (
            <div
              key={lead.leadId}
              className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-red-500/10"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm font-medium truncate">
                  {lead.leadName}
                </span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {lead.status}
                </Badge>
                {lead.priority && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] shrink-0",
                      lead.priority === "HOT" &&
                        "border-red-500/50 text-red-500",
                      lead.priority === "WARM" &&
                        "border-amber-500/50 text-amber-500",
                      lead.priority === "COLD" &&
                        "border-blue-400/50 text-blue-400",
                    )}
                  >
                    {lead.priority}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-3">
                <Clock className="h-3 w-3" />
                {lead.hoursSinceUpdate}h overdue
                {lead.assignedTo && (
                  <span className="hidden sm:inline">· {lead.assignedTo}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
