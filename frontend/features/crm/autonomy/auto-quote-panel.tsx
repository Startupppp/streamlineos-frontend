"use client";

import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useAutonomySettings, useUpdateAutonomySettings } from "@/hooks/api/crm/autonomy";
import { getErrorMessage } from "@/lib/get-error-message";

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
