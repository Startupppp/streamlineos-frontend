"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
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
  const tone = statusToneClasses("info");
  const eyebrow = reason === "needs-reauth" ? "Reconnect" : "Connect account";

  async function handleConnect() {
    try {
      const { redirectUrl } = await initiate.mutateAsync({ toolkit });
      window.location.assign(redirectUrl);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div
      role="region"
      aria-label={actionLabel}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-l-2 px-2.5 py-2",
        tone.surface,
        tone.rule,
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={cn("text-[10px] font-semibold uppercase tracking-wider", tone.ink)}>
          {eyebrow}
        </p>
        <p className={cn("text-[13px] leading-5", canManage ? "text-foreground" : "text-muted-foreground")}>
          {canManage ? summary : `Ask an admin to connect your ${providerLabel} account.`}
        </p>
      </div>
      {canManage ? (
        <LoadingButton
          size="sm"
          isPending={initiate.isPending}
          onClick={handleConnect}
          className="h-7 shrink-0 px-2.5 text-xs"
        >
          {actionLabel}
        </LoadingButton>
      ) : null}
    </div>
  );
}
