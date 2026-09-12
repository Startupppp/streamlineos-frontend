"use client";

import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useAutonomySettings, useUpdateAutonomySettings } from "@/hooks/api/crm/autonomy";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * CRM-P1-17. The opt-in that lets the system draft a quote on its own.
 *
 * `auto_quote_enabled` has been on the settings row and in the PATCH schema
 * since the feature shipped, and the read and write hooks existed with no
 * consumer anywhere — so an organisation could only turn this on by issuing a
 * raw PATCH, and one that already had it on had nowhere to see that.
 *
 * Off is the shipped default and stays the honest one. What the toggle buys is
 * that the choice is visible: a system that drafts quotes to customers without
 * being asked should not be a setting nobody can find.
 *
 * The hold window is shown beside it, because it is the answer to the question
 * this toggle immediately raises — a drafted quote is not a sent quote, and the
 * window is how long somebody has to stop it.
 */
export function AutoQuotePanel() {
  const canManage = useCan("crm:autonomy:manage");
  const { data: settings, isLoading } = useAutonomySettings();
  const update = useUpdateAutonomySettings();

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-gap-inline">
          <FileText className="size-4" />
          Drafting quotes
        </CardTitle>
        <CardDescription>
          Whether the system may write a quote before anybody asks it to.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-gap-field">
        <div className="flex flex-wrap items-center justify-between gap-gap-field">
          <div className="min-w-0 flex-1">
            <Label htmlFor="auto-quote" className="text-sm font-medium">
              Draft quotes automatically
            </Label>
            <p className="mt-0.5 text-micro text-muted-foreground">
              {settings.autoQuoteEnabled
                ? `Drafted quotes wait ${settings.holdWindowSeconds}s before sending, so somebody can stop one.`
                : "Off. Quotes are written only when somebody asks for one."}
            </p>
          </div>

          <Switch
            id="auto-quote"
            /* Server-driven, not optimistic: a toggle that springs back is
               clearer than one that lies about what the system will do. */
            checked={settings.autoQuoteEnabled}
            disabled={!canManage || update.isPending}
            onCheckedChange={(autoQuoteEnabled) => update.mutate({ autoQuoteEnabled })}
            aria-label="Draft quotes automatically"
          />
        </div>

        {update.isError ? (
          <p role="alert" className="text-label text-status-danger-ink">
            {getErrorMessage(update.error)}
          </p>
        ) : null}

        {!canManage ? (
          <p className="text-micro text-muted-foreground">
            Changing this needs the autonomy manage permission.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
