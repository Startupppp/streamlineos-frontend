"use client";

import { useCallback, useState } from "react";
import { CalendarCheck2, Loader2, Plus, RefreshCw, Star, Unplug } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { RequireModule } from "@/components/auth/require-module";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useIntegrationConnections,
  useInitiateIntegrationConnection,
  useDisconnectIntegration,
  useSetPrimaryIntegration,
  type IntegrationConnection,
  type IntegrationToolkit,
} from "@/hooks/api/integrations";

const TOOLKIT_LABELS: Record<IntegrationToolkit, string> = {
  googlecalendar: "Google Calendar",
  outlook: "Microsoft Outlook",
};

const CONNECT_OPTIONS: { toolkit: IntegrationToolkit; label: string }[] = [
  { toolkit: "googlecalendar", label: "Google Calendar" },
  { toolkit: "outlook", label: "Microsoft Outlook" },
];

function ConnectButton({
  toolkit,
  label,
  pending,
  disabled,
  onConnect,
}: {
  toolkit: IntegrationToolkit;
  label: string;
  pending: boolean;
  disabled: boolean;
  onConnect: (toolkit: IntegrationToolkit) => void;
}) {
  const handleClick = useCallback(() => onConnect(toolkit), [onConnect, toolkit]);
  return (
    <Button
      variant="outline"
      size="sm"
      className="sm:flex-1"
      disabled={disabled}
      onClick={handleClick}
    >
      {pending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Plus className="mr-1.5 h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}

function ConnectionRow({
  connection,
  onReconnect,
  onDisconnect,
  onSetPrimary,
  isBusy,
}: {
  connection: IntegrationConnection;
  onReconnect: (toolkit: IntegrationToolkit) => void;
  onDisconnect: (id: number) => void;
  onSetPrimary: (id: number) => void;
  isBusy: boolean;
}) {
  const handleReconnect = useCallback(
    () => onReconnect(connection.toolkit),
    [onReconnect, connection.toolkit],
  );
  const handleDisconnect = useCallback(
    () => onDisconnect(connection.id),
    [onDisconnect, connection.id],
  );
  const handleSetPrimary = useCallback(
    () => onSetPrimary(connection.id),
    [onSetPrimary, connection.id],
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
              {connection.accountEmail ?? connection.accountLabel ?? TOOLKIT_LABELS[connection.toolkit]}
            </p>
            {connection.isPrimary && (
              <Badge variant="default" className="shrink-0 text-[10px]">
                Default
              </Badge>
            )}
            {connection.status === "needs_reauth" && (
              <Badge variant="outline" className="shrink-0 text-[10px] text-amber-600">
                Needs reconnect
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {TOOLKIT_LABELS[connection.toolkit]} · Connected{" "}
            {format(new Date(connection.createdAt), "MMM d, yyyy")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        {connection.status === "needs_reauth" && (
          <Button variant="outline" size="sm" onClick={handleReconnect} disabled={isBusy}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reconnect
          </Button>
        )}
        {!connection.isPrimary && connection.status === "active" && (
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
  const { data: connections = [], isLoading, isError, refetch } = useIntegrationConnections();
  const initiate = useInitiateIntegrationConnection();
  const disconnect = useDisconnectIntegration();
  const setPrimary = useSetPrimaryIntegration();
  const [pendingToolkit, setPendingToolkit] = useState<IntegrationToolkit | null>(null);

  const handleConnect = useCallback(
    async (toolkit: IntegrationToolkit) => {
      setPendingToolkit(toolkit);
      try {
        const { redirectUrl } = await initiate.mutateAsync(toolkit);
        window.location.assign(redirectUrl);
      } catch (e) {
        setPendingToolkit(null);
        toast.error(getErrorMessage(e));
      }
    },
    [initiate],
  );

  const handleDisconnect = useCallback(
    (connectionId: number) => {
      disconnect.mutate(connectionId, {
        onSuccess: () => toast.success("Calendar disconnected"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [disconnect],
  );

  const handleSetPrimary = useCallback(
    (connectionId: number) => {
      setPrimary.mutate(connectionId, {
        onSuccess: () => toast.success("Default calendar updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [setPrimary],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const isBusy = disconnect.isPending || setPrimary.isPending;
  const hasConnections = connections.length > 0;

  return (
    <PageWrapper
      title="Calendar Integration"
      subtitle="Connect Google or Microsoft Outlook accounts for real-time availability and automatic event creation"
      backHref="/settings/integrations"
      badge="HR module"
    >
      <RequireModule module="HR">
        {isLoading ? (
          <div className="max-w-2xl space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
            <CalendarCheck2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Failed to load calendars</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Unable to fetch your calendar connections.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Try again
            </Button>
          </div>
        ) : (
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
                        onReconnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        onSetPrimary={handleSetPrimary}
                        isBusy={isBusy}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    illustration={<EmptyCalendarIllustration />}
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
                    <ConnectButton
                      key={option.toolkit}
                      toolkit={option.toolkit}
                      label={option.label}
                      pending={pendingToolkit === option.toolkit}
                      disabled={pendingToolkit !== null}
                      onConnect={handleConnect}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  You can connect multiple accounts. The account marked{" "}
                  <span className="font-medium text-foreground">Default</span> is used to create new
                  calendar events; availability is checked across all connected calendars.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-1 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">What this enables</p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>Real-time interviewer availability across every connected calendar</li>
                <li>Automatic event creation on your default calendar with panel members invited</li>
                <li>Meeting link and location included in calendar invites</li>
              </ul>
            </div>
          </div>
        )}
      </RequireModule>
    </PageWrapper>
  );
}
