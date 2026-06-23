"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";

type CalendarProvider = "GOOGLE" | "MICROSOFT";

interface CalendarConnection {
  id: number;
  provider: CalendarProvider;
  providerEmail: string | null;
  expiresAt: string | null;
  updatedAt: string;
}

function CalendarProviderCard({
  provider,
  label,
  description,
  connection,
  connectHref,
  onDisconnect,
  isDisconnecting,
}: {
  provider: CalendarProvider;
  label: string;
  description: string;
  connection: CalendarConnection | undefined;
  connectHref: string;
  onDisconnect: (p: CalendarProvider) => void;
  isDisconnecting: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">{label}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
          {connection ? (
            <Badge variant="default" className="shrink-0 text-[10px]">Connected</Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0 text-[10px]">Not connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {connection ? (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground space-y-1">
              {connection.providerEmail && (
                <p>Account: <span className="font-medium text-foreground">{connection.providerEmail}</span></p>
              )}
              <p>Connected: <span className="font-medium text-foreground">{format(new Date(connection.updatedAt), "MMM d, yyyy")}</span></p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDisconnect(provider)}
              disabled={isDisconnecting}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Connect your {label} calendar to enable automatic interview scheduling, real-time
              availability checks, and event creation for interviews.
            </p>
            <Button size="sm" asChild>
              <a href={connectHref}>Connect {label}</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CalendarIntegrationsPage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["calendarConnections"],
    queryFn: () => apiClient.get<CalendarConnection[]>("/auth/calendar/status"),
    staleTime: 60_000,
  });

  const disconnect = useMutation({
    mutationFn: (provider: CalendarProvider) =>
      apiClient.post("/auth/calendar/disconnect", { provider }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["calendarConnections"] });
      toast.success("Calendar disconnected");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleDisconnect = useCallback(
    (provider: CalendarProvider) => disconnect.mutate(provider),
    [disconnect]
  );

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "google") toast.success("Google Calendar connected successfully");
    if (success === "microsoft") toast.success("Microsoft Outlook Calendar connected successfully");
    if (error === "access_denied") toast.error("Calendar access was denied");
    if (error === "exchange_failed") toast.error("Failed to connect calendar — please try again");
  }, [searchParams]);

  const googleConnection = connections.find((c) => c.provider === "GOOGLE");
  const microsoftConnection = connections.find((c) => c.provider === "MICROSOFT");

  if (isLoading) {
    return (
      <PageWrapper title="Calendar Integration" subtitle="Connect your calendar for interview scheduling">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Calendar Integration"
      subtitle="Connect Google or Microsoft Outlook to enable real-time availability and automatic event creation"
    >
      <div className="max-w-2xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CalendarProviderCard
            provider="GOOGLE"
            label="Google Calendar"
            description="Google Workspace and Gmail accounts"
            connection={googleConnection}
            connectHref="/api/auth/calendar/google"
            onDisconnect={handleDisconnect}
            isDisconnecting={disconnect.isPending}
          />
          <CalendarProviderCard
            provider="MICROSOFT"
            label="Microsoft Outlook"
            description="Microsoft 365 and Outlook.com accounts"
            connection={microsoftConnection}
            connectHref="/api/auth/calendar/microsoft"
            onDisconnect={handleDisconnect}
            isDisconnecting={disconnect.isPending}
          />
        </div>
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">What this enables</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Real-time interviewer availability when scheduling interviews</li>
            <li>Automatic calendar event creation with all panel members invited</li>
            <li>Meeting link and location included in calendar invites</li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
}
