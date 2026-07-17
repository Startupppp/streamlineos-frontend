"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useIntegrationConnections,
  useInitiateIntegrationConnection,
  useDisconnectIntegration,
  type IntegrationConnection,
  type IntegrationToolkit,
} from "@/hooks/api/integrations";

interface AppConfig {
  toolkit: IntegrationToolkit;
  label: string;
  description: string;
  category: string;
}

const APP_CONFIGS: AppConfig[] = [
  {
    toolkit: "googlecalendar",
    label: "Google Calendar",
    description: "Sync leave events, meetings, and HR reminders to Google Calendar.",
    category: "Calendar",
  },
  {
    toolkit: "outlook",
    label: "Microsoft Outlook",
    description: "Sync leave events and HR reminders to Outlook Calendar.",
    category: "Calendar",
  },
];

function AppCard({
  config,
  connection,
}: {
  config: AppConfig;
  connection: IntegrationConnection | undefined;
}) {
  const initiate = useInitiateIntegrationConnection();
  const disconnect = useDisconnectIntegration();

  const handleConnect = useCallback(async () => {
    try {
      const result = await initiate.mutateAsync(config.toolkit);
      window.location.href = result.redirectUrl;
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [initiate, config.toolkit]);

  const handleDisconnect = useCallback(async () => {
    if (!connection) return;
    if (!confirm(`Disconnect ${config.label}?`)) return;
    try {
      await disconnect.mutateAsync(connection.id);
      toast.success(`${config.label} disconnected`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [disconnect, connection, config.label]);

  const isConnected = !!connection;

  return (
    <div className="flex items-start gap-4 px-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{config.label}</span>
          <Badge variant="outline" className="text-[11px]">
            {config.category}
          </Badge>
          {isConnected ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {connection.status === "needs_reauth" ? "Needs Reauth" : "Connected"}
            </Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground border-border text-[11px] gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
        {connection?.accountEmail && (
          <TruncatedText
            text={connection.accountEmail}
            className="text-[11px] text-muted-foreground font-mono min-w-0 break-all"
          />
        )}
      </div>
      <div className="shrink-0">
        {isConnected ? (
          <LoadingButton
            variant="outline"
            size="sm"
            isPending={disconnect.isPending}
            onClick={handleDisconnect}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Unlink className="h-3.5 w-3.5" />
            Disconnect
          </LoadingButton>
        ) : (
          <LoadingButton
            variant="outline"
            size="sm"
            isPending={initiate.isPending}
            onClick={handleConnect}
          >
            Connect
          </LoadingButton>
        )}
      </div>
    </div>
  );
}

export function ConnectedAppsSection() {
  const { data: connections, isLoading } = useIntegrationConnections();

  const connectionByToolkit = useCallback(
    (toolkit: IntegrationToolkit) =>
      connections?.find((c) => c.toolkit === toolkit),
    [connections],
  );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Connected Apps</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Third-party app connections managed securely via Composio.
        </p>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {APP_CONFIGS.map((c) => (
              <Skeleton key={c.toolkit} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : (
          APP_CONFIGS.map((config) => (
            <AppCard
              key={config.toolkit}
              config={config}
              connection={connectionByToolkit(config.toolkit)}
            />
          ))
        )}
      </div>
    </div>
  );
}
