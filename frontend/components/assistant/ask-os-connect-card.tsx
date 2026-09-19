"use client";

import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useInitiateIntegrationConnection, type IntegrationToolkit } from "@/hooks/api/integrations";
import { useCan } from "@/hooks/api/access";
import type { ConnectIntegrationDirective } from "./ask-os-directive-schema";

const PROVIDER_LABELS: Record<IntegrationToolkit, string> = {
  googlecalendar: "Google Calendar",
  outlook: "Outlook",
  gmail: "Gmail",
};

interface AskOsConnectCardProps {
  toolkit: ConnectIntegrationDirective["toolkit"];
  reason: ConnectIntegrationDirective["reason"];
  summary: string;
}

export function AskOsConnectCard({ toolkit, reason, summary }: AskOsConnectCardProps) {
  const canManage = useCan("integrations:connections:manage");
  const initiate = useInitiateIntegrationConnection();
  const providerLabel = PROVIDER_LABELS[toolkit];
  const actionLabel = reason === "needs-reauth"
    ? `Reconnect ${providerLabel}`
    : `Connect ${providerLabel}`;

  async function handleConnect() {
    try {
      const { redirectUrl } = await initiate.mutateAsync({
        toolkit,
        returnPath: window.location.pathname,
      });
      window.location.assign(redirectUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (!canManage) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Ask an admin to connect your {providerLabel} account.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="min-w-0 flex-1 text-[13px] leading-5 text-foreground">{summary}</p>
      <LoadingButton
        size="sm"
        isPending={initiate.isPending}
        onClick={handleConnect}
        className="h-7 shrink-0 px-2.5 text-xs"
      >
        {actionLabel}
      </LoadingButton>
    </div>
  );
}
