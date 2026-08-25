"use client";

import {
  Mail,
  Phone,
  MessageSquare,
  User,
  DollarSign,
  CalendarDays,
  FileText,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "./info-row";
import { ActivityItem } from "./activity-item";
import { formatAmount, formatDate } from "./utils";
import type { ClientAccountWithActivities } from "@/types/crm";

const RENEWAL_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  in_discussion: "In Discussion",
  renewed: "Renewed",
  churned: "Churned",
};

export function ClientOverviewTab({ client }: { client: ClientAccountWithActivities }) {
  const recentActivities = client.activities.slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <InfoRow icon={Mail} label="Email" value={client.clientEmail} />
            <InfoRow icon={Phone} label="Phone" value={client.clientPhone} />
            <InfoRow icon={MessageSquare} label="WhatsApp" value={client.clientWhatsapp} />
            <InfoRow icon={User} label="Sales Rep" value={client.salesRep?.name ?? "—"} />
            <InfoRow
              icon={User}
              label="CRM Rep"
              value={client.assignedCrm?.name ?? "Unassigned"}
            />
          </CardContent>
        </Card>

        {recentActivities.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="px-4 py-3 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
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
        )}
      </div>

      <Card className="shadow-sm self-start">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Investment Info
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3">
          <InfoRow
            icon={DollarSign}
            label="Investment Amount"
            value={formatAmount(client.investmentAmount)}
          />
          <InfoRow
            icon={DollarSign}
            label="Estimated Investment"
            value={formatAmount(client.estimatedInvestment)}
          />
          <InfoRow icon={FileText} label="Plan" value={client.planName} />
          <InfoRow
            icon={CalendarDays}
            label="Investment Date"
            value={formatDate(client.investmentDate)}
          />
          <InfoRow
            icon={CalendarDays}
            label="Converted At"
            value={formatDate(client.convertedAt)}
          />
          <InfoRow icon={FileText} label="Transaction Ref" value={client.transactionRef} />
          <InfoRow
            icon={RefreshCw}
            label="Renewal Stage"
            value={RENEWAL_LABELS[client.renewalStage] ?? client.renewalStage}
          />
          <InfoRow
            icon={CalendarDays}
            label="Renewal Date"
            value={formatDate(client.renewalDate)}
          />
          {client.conversionNotes && (
            <div className="pt-2 mt-1 border-t border-border/50">
              <p className="text-micro text-muted-foreground mb-1">Conversion Notes</p>
              <p className="text-dense text-foreground">{client.conversionNotes}</p>
            </div>
          )}
          {client.renewalNotes && (
            <div className="pt-2 mt-1 border-t border-border/50">
              <p className="text-micro text-muted-foreground mb-1">Renewal Notes</p>
              <p className="text-dense text-foreground">{client.renewalNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
