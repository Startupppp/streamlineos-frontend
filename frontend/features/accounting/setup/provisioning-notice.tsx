"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import type { AccountingProvisioning } from "@/types/accounting/accounting-kernel-ext";


interface Presentation {
  tone: "danger" | "warning";
  icon: typeof AlertTriangle;
  headline: string;
  action?: { label: string; href: string };
}

function present(provisioning: AccountingProvisioning): Presentation | null {
  switch (provisioning.state) {
    case "unprovisioned":
      return {
        tone: "danger",
        icon: AlertTriangle,
        headline: "Accounting is on, but there is no book to post to",
        action: { label: "Create the book", href: "/accounting/setup" },
      };
    case "incomplete":
      return {
        tone: "danger",
        icon: AlertTriangle,
        headline:
          "Some account roles are unmapped, and movements needing them are refused",
        action: { label: "Map the accounts", href: "/accounting/settings" },
      };
    case "fiscal_year_ending":
      return {
        tone: "warning",
        icon: CalendarClock,
        headline: "The fiscal year ends soon and no year follows it",
        action: {
          label: "Open accounting periods",
          href: "/accounting/periods",
        },
      };
    case "not_requested":
    case "ready":
      return null;
  }
}

export function ProvisioningNotice({
  provisioning,
}: {
  provisioning: AccountingProvisioning;
}) {
  const shown = present(provisioning);
  if (!shown) return null;

  const tone = statusToneClasses(shown.tone);
  const Icon = shown.icon;
  const message = "message" in provisioning ? provisioning.message : "";

  return (
    <Card
      className={cn(tone.surface, tone.rule)}
      data-testid="provisioning-notice"
    >
      <CardContent className="flex items-start gap-3 py-4">
        <Icon className={cn("mt-0.5 size-4 shrink-0", tone.ink)} aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("text-sm font-medium", tone.inkStrong)}>
            {shown.headline}
          </p>
          <p className="text-muted-foreground text-sm">{message}</p>
          {provisioning.state === "fiscal_year_ending" ? (
            <p className="text-muted-foreground text-sm">
              {provisioning.daysRemaining <= 0
                ? `The last period ended on ${provisioning.endsOn}.`
                : `${provisioning.daysRemaining} ${provisioning.daysRemaining === 1 ? "day" : "days"} left — the last period ends on ${provisioning.endsOn}.`}
            </p>
          ) : null}
        </div>
        {shown.action ? (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={shown.action.href}>{shown.action.label}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
