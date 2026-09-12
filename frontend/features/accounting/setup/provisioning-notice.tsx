"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import type { AccountingProvisioning } from "@/types/accounting-kernel";

/**
 * The provisioning verdict, rendered.
 *
 * The backend has computed this since ACC-02 and the API has carried it in
 * `/accounting/setup/status` ever since — and nothing displayed it, so a
 * verdict whose entire purpose is to be read arrived at a screen that dropped
 * it. Two of the three states it reports are conditions under which stock
 * movements are being refused or lost right now.
 *
 * The messages come from the server rather than being restated here. They name
 * the specific roles missing and the specific date the year ends, and a second
 * copy on this side would drift from the rule that produced them.
 */

interface Presentation {
  tone: "danger" | "warning";
  icon: typeof AlertTriangle;
  headline: string;
  action?: { label: string; href: string };
}

function present(provisioning: AccountingProvisioning): Presentation | null {
  switch (provisioning.state) {
    case "unprovisioned":
      /*
        The state that looked exactly like opting out. An organisation here is
        paying for accounting and posting into a void, so it reads as danger
        rather than as an invitation to set something up.
      */
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
        headline: "Some account roles are unmapped, and movements needing them are refused",
        action: { label: "Map the accounts", href: "/accounting/settings" },
      };
    case "fiscal_year_ending":
      /*
        A warning, not an error: nothing is broken yet. It is here at all
        because the failure it precedes is silent — receipts and invoices
        simply start being rejected on a date, with a message about a missing
        period rather than about a calendar.
      */
      return {
        tone: "warning",
        icon: CalendarClock,
        headline: "The fiscal year ends soon and no year follows it",
        action: { label: "Open accounting periods", href: "/accounting/periods" },
      };
    case "not_requested":
    case "ready":
      return null;
  }
}

export function ProvisioningNotice({ provisioning }: { provisioning: AccountingProvisioning }) {
  const shown = present(provisioning);
  if (!shown) return null;

  const tone = statusToneClasses(shown.tone);
  const Icon = shown.icon;
  const message = "message" in provisioning ? provisioning.message : "";

  return (
    <Card className={cn(tone.surface, tone.rule)} data-testid="provisioning-notice">
      <CardContent className="flex items-start gap-3 py-4">
        <Icon className={cn("mt-0.5 size-4 shrink-0", tone.ink)} aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("text-sm font-medium", tone.inkStrong)}>{shown.headline}</p>
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
