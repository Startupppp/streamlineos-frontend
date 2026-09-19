"use client";

import { toast } from "sonner";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
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
      <AiDraftCard title={summary} hideFooter>
        <p className="text-xs text-muted-foreground">
          Ask an admin to connect your {providerLabel} account.
        </p>
      </AiDraftCard>
    );
  }

  return (
    <AiDraftCard
      title={summary}
      onAccept={handleConnect}
      acceptLabel={actionLabel}
      isAcceptPending={initiate.isPending}
    >
      <p className="text-xs text-muted-foreground">
        {reason === "needs-reauth"
          ? `Your ${providerLabel} connection needs to be refreshed.`
          : `Connect your ${providerLabel} account to continue.`}
      </p>
    </AiDraftCard>
  );
}
