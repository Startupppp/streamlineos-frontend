import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type { SlaAlertResponse } from "@/types/leads";

interface SlaAlertCardProps {
  slaData: SlaAlertResponse;
}

function hoursOverdue(slaDeadline: string | null, updatedAt: string): number {
  const ref = slaDeadline ? new Date(slaDeadline) : new Date(updatedAt);
  return Math.max(0, Math.floor((Date.now() - ref.getTime()) / (1000 * 60 * 60)));
}

export function SlaAlertCard({ slaData }: SlaAlertCardProps) {
  return (
    <Card className="border-status-danger-rule bg-status-danger-surface">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-status-danger-ink">
          <AlertTriangle className="h-4 w-4" />
          SLA Breached — {slaData.total} leads not contacted in 24h+
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[160px] overflow-y-auto">
          {slaData.leads.slice(0, 8).map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-status-danger-rule"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <TruncatedText text={lead.name} className="text-sm font-medium" />
                <Badge variant="outline" className="text-micro shrink-0">
                  {lead.status}
                </Badge>
                {lead.priority && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-micro shrink-0",
                      lead.priority === "HOT" &&
                        "border-status-danger-rule text-status-danger-ink",
                      lead.priority === "WARM" &&
                        "border-status-warning-rule text-status-warning-ink",
                      lead.priority === "COLD" &&
                        "border-primary/50 text-primary",
                    )}
                  >
                    {lead.priority}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-3">
                <Clock className="h-3 w-3" />
                {hoursOverdue(lead.slaDeadline, lead.updatedAt)}h overdue
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
