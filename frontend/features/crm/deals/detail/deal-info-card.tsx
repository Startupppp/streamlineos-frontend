"use client";

import { Calendar, User, Phone, Mail, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TruncatedText } from "@/components/ui/truncated-text";

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

interface DealInfo {
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  expectedCloseDate?: string | null;
  actualCloseDate?: string | null;
  probability?: number | null;
  notes?: string | null;
  lostReason?: string | null;
  value?: string | null;
}

interface DealInfoCardProps {
  deal: DealInfo;
}

export function DealInfoCard({ deal }: DealInfoCardProps) {
  const dealValue = Number(deal.value ?? 0);

  const fields: Array<{ icon: LucideIcon; label: string; value: string | null | undefined; href: string | undefined }> = [
    {
      icon: User,
      label: "Contact Person",
      value: deal.contactPerson,
      href: undefined,
    },
    {
      icon: Mail,
      label: "Contact Email",
      value: deal.contactEmail,
      href: deal.contactEmail ? `mailto:${deal.contactEmail}` : undefined,
    },
    {
      icon: Phone,
      label: "Contact Phone",
      value: deal.contactPhone,
      href: deal.contactPhone ? `tel:${deal.contactPhone}` : undefined,
    },
    {
      icon: Calendar,
      label: "Expected Close",
      value: deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN")
        : null,
      href: undefined,
    },
    {
      icon: Calendar,
      label: "Actual Close",
      value: deal.actualCloseDate
        ? new Date(deal.actualCloseDate).toLocaleDateString("en-IN")
        : null,
      href: undefined,
    },
    {
      icon: Clock,
      label: "Probability",
      value: `${deal.probability ?? 0}%`,
      href: undefined,
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Deal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {fields.map((item) => (
            <div key={item.label} className="flex items-start gap-2 min-w-0">
              <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                {item.href ? (
                  <a href={item.href} className="text-sm text-primary hover:underline break-all">
                    {item.value || "—"}
                  </a>
                ) : (
                  <TruncatedText text={item.value ?? "—"} className="text-sm" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border border-border">
          <p className="text-xs text-muted-foreground">Deal Value</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">{formatINR(dealValue)}</p>
          {deal.probability !== null && deal.probability !== undefined && deal.probability > 0 && (
            <div className="mt-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${deal.probability}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Weighted: {formatINR(Math.round(dealValue * (deal.probability / 100)))}
              </p>
            </div>
          )}
        </div>

        {deal.notes && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
          </div>
        )}

        {deal.lostReason && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-xs text-red-400 mb-1">Lost Reason</p>
            <p className="text-sm">{deal.lostReason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
