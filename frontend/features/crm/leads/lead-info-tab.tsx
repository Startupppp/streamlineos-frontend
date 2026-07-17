"use client";

interface LeadCampaign {
  name: string;
}

interface LeadInfoTabProps {
  createdAt?: string | null;
  assignedAt?: string | null;
  convertedAt?: string | null;
  campaign?: LeadCampaign | null;
}

export function LeadInfoTab({
  createdAt,
  assignedAt,
  convertedAt,
  campaign,
}: LeadInfoTabProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
        <p className="text-[11px] text-muted-foreground mb-1">Created</p>
        <p className="text-sm font-medium">
          {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
        </p>
      </div>
      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
        <p className="text-[11px] text-muted-foreground mb-1">Assigned</p>
        <p className="text-sm font-medium">
          {assignedAt ? new Date(assignedAt).toLocaleDateString() : "—"}
        </p>
      </div>
      {convertedAt && (
        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
          <p className="text-[11px] text-muted-foreground mb-1">Converted</p>
          <p className="text-sm font-medium">
            {new Date(convertedAt).toLocaleDateString()}
          </p>
        </div>
      )}
      {campaign && (
        <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
          <p className="text-[11px] text-muted-foreground mb-1">Campaign</p>
          <p className="text-sm font-medium truncate">{campaign.name}</p>
        </div>
      )}
    </div>
  );
}
