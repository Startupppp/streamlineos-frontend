"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Plus, Star, Unplug } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";

type CalendarProvider = "GOOGLE" | "MICROSOFT";

interface CalendarConnection {
  id: number;
  provider: CalendarProvider;
  providerEmail: string | null;
  isPrimary: boolean;
  expiresAt: string | null;
  updatedAt: string;
}

const PROVIDER_LABELS: Record<CalendarProvider, string> = {
  GOOGLE: "Google Calendar",
  MICROSOFT: "Microsoft Outlook",
};

const CONNECT_OPTIONS: { provider: CalendarProvider; label: string; href: string }[] = [
  { provider: "GOOGLE", label: "Google Calendar", href: "/api/auth/calendar/google" },
  { provider: "MICROSOFT", label: "Microsoft Outlook", href: "/api/auth/calendar/microsoft" },
];

function ConnectionRow({
  connection,
  onDisconnect,
  onSetPrimary,
  isBusy,
}: {
  connection: CalendarConnection;
  onDisconnect: (id: number) => void;
  onSetPrimary: (id: number) => void;
  isBusy: boolean;
}) {
  const handleDisconnect = useCallback(
    () => onDisconnect(connection.id),
    [onDisconnect, connection.id]
  );
  const handleSetPrimary = useCallback(
    () => onSetPrimary(connection.id),
    [onSetPrimary, connection.id]
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {connection.providerEmail ?? PROVIDER_LABELS[connection.provider]}
            </p>
            {connection.isPrimary && (
              <Badge variant="default" className="shrink-0 text-[10px]">Default</Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {PROVIDER_LABELS[connection.provider]} · Connected{" "}
            {format(new Date(connection.updatedAt), "MMM d, yyyy")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        {!connection.isPrimary && (
          <Button variant="ghost" size="sm" onClick={handleSetPrimary} disabled={isBusy}>
            <Star className="mr-1.5 h-3.5 w-3.5" />
            Make default
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={isBusy}
          className="text-destructive hover:text-destructive"
        >
          <Unplug className="mr-1.5 h-3.5 w-3.5" />
          Disconnect
        </Button>
      </div>
    </div>
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
    mutationFn: (connectionId: number) =>
      apiClient.post("/auth/calendar/disconnect", { connectionId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["calendarConnections"] });
      toast.success("Calendar disconnected");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const setPrimary = useMutation({
    mutationFn: (connectionId: number) =>
      apiClient.post("/auth/calendar/primary", { connectionId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["calendarConnections"] });
      toast.success("Default calendar updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleDisconnect = useCallback(
    (connectionId: number) => disconnect.mutate(connectionId),
    [disconnect]
  );
  const handleSetPrimary = useCallback(
    (connectionId: number) => setPrimary.mutate(connectionId),
    [setPrimary]
  );

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "google") toast.success("Google Calendar connected successfully");
    if (success === "microsoft") toast.success("Microsoft Outlook Calendar connected successfully");
    if (error === "access_denied") toast.error("Calendar access was denied");
    if (error === "exchange_failed") toast.error("Failed to connect calendar — please try again");
  }, [searchParams]);

  const isBusy = disconnect.isPending || setPrimary.isPending;
  const hasConnections = connections.length > 0;

  if (isLoading) {
    return (
      <PageWrapper title="Calendar Integration" subtitle="Connect your calendars for interview scheduling">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Calendar Integration"
      subtitle="Connect one or more Google or Microsoft Outlook accounts for real-time availability and automatic event creation"
    >
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Connected calendars</CardTitle>
          </CardHeader>
          <CardContent>
            {hasConnections ? (
              <div className="space-y-2">
                {connections.map((connection) => (
                  <ConnectionRow
                    key={connection.id}
                    connection={connection}
                    onDisconnect={handleDisconnect}
                    onSetPrimary={handleSetPrimary}
                    isBusy={isBusy}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarCheck2}
                title="No calendars connected"
                description="Connect a Google or Microsoft Outlook account below to enable availability checks and automatic interview events."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {hasConnections ? "Add another calendar" : "Connect a calendar"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row">
              {CONNECT_OPTIONS.map((option) => (
                <Button key={option.provider} variant="outline" size="sm" asChild className="sm:flex-1">
                  <a href={option.href}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {option.label}
                  </a>
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              You can connect multiple accounts. The account marked{" "}
              <span className="font-medium text-foreground">Default</span> is used to create new
              calendar events; availability is checked across all connected calendars.
            </p>
          </CardContent>
        </Card>

        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">What this enables</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Real-time interviewer availability across every connected calendar</li>
            <li>Automatic event creation on your default calendar with panel members invited</li>
            <li>Meeting link and location included in calendar invites</li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
}
