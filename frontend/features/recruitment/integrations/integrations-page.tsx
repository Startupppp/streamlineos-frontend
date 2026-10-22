"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useConnectIntegration,
  useDisconnectIntegration,
  useRecruitmentIntegrations,
  useRotateInboundSecret,
  type RecruitmentIntegration,
} from "@/hooks/api/hr/recruitment/integrations";
import { IntegrationCard } from "./integration-card";
import { InboundSecretDialog, type IssuedSecret } from "./inbound-secret-dialog";
import { SourcingExtensionCard } from "./sourcing-extension-card";
import { JobBoardPortalsSection } from "./job-board-portals-section";

const FAMILY_TITLE: Record<RecruitmentIntegration["family"], string> = {
  "job-board": "Job boards",
  "ats-sync": "Recruiter sync",
  calendar: "Calendars",
  transcription: "Interview transcription",
  "voice-screen": "Voice screening",
  assessment: "Assessments",
  "background-check": "Background verification",
  identity: "Identity verification",
  messaging: "Candidate messaging",
  "chat-notify": "Interviewer notifications",
};

const FAMILY_ORDER: RecruitmentIntegration["family"][] = [
  "job-board",
  "ats-sync",
  "calendar",
  "assessment",
  "transcription",
  "voice-screen",
  "background-check",
  "identity",
  "messaging",
  "chat-notify",
];

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}

export function RecruitmentIntegrationsPage() {
  const { data, isLoading, isError, error, refetch } = useRecruitmentIntegrations();
  const connect = useConnectIntegration();
  const disconnect = useDisconnectIntegration();
  const rotate = useRotateInboundSecret();
  const [issued, setIssued] = useState<IssuedSecret | null>(null);

  const pageState = usePageState({
    permission: "hr:requisitions:manage",
    isLoading,
    isError,
    error,
  });

  const grouped = useMemo(() => {
    const byFamily = new Map<RecruitmentIntegration["family"], RecruitmentIntegration[]>();
    for (const entry of data ?? []) {
      const list = byFamily.get(entry.family) ?? [];
      list.push(entry);
      byFamily.set(entry.family, list);
    }
    return [...byFamily.entries()]
      .map(([family, entries]) => ({ family, entries }))
      .sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family));
  }, [data]);

  const handleConnect = useCallback(
    (platform: string, token: string) => {
      connect.mutate(
        { platform, token, isActive: true },
        {
          onSuccess: (result) => {
            toast.success(
              result.blockedCode === null
                ? `${result.label} connected`
                : `Key saved for ${result.label}`,
              {
                description:
                  result.blockedCode === "not-implemented"
                    ? "It still cannot be used: " + (result.blockedBy ?? "")
                    : undefined,
              },
            );
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [connect],
  );

  const handleToggleActive = useCallback(
    (platform: string, isActive: boolean) => {
      connect.mutate(
        { platform, isActive },
        {
          onSuccess: (result) =>
            toast.success(isActive ? `${result.label} switched on` : `${result.label} switched off`),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [connect],
  );

  const handleDisconnect = useCallback(
    (platform: string) => {
      disconnect.mutate(platform, {
        onSuccess: () => toast.success("Disconnected"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [disconnect],
  );

  const handleRotateSecret = useCallback(
    (platform: string) => {
      rotate.mutate(platform, {
        onSuccess: (result) => setIssued(result),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [rotate],
  );

  const handleCloseSecret = useCallback(() => setIssued(null), []);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const isPending = connect.isPending || disconnect.isPending || rotate.isPending;

  return (
    <PageWrapper
      title="Integrations"
      subtitle="What Recruitment OS can talk to, and what it currently can."
      backHref="/recruitment/settings"
    >
      <PageState resolution={pageState} loading={<LoadingSkeleton />} onRetry={handleRetry}>
        <div className="space-y-6">
          
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Sourcing</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SourcingExtensionCard />
            </div>
          </section>

          
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Job board sync</h2>
            <JobBoardPortalsSection />
          </section>

          
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Build your own</h2>
            <Link
              href="/recruitment/developer"
              className="block rounded-xl border p-4 text-sm transition-colors hover:bg-muted/40"
            >
              <span className="font-medium text-foreground">Hiring webhooks and signatures</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                The five hiring events, a signed example you can verify, a replay button, and what
                sign-on and directory sync actually do here.
              </span>
            </Link>
          </section>

          {grouped.map(({ family, entries }) => (
            <section key={family} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{FAMILY_TITLE[family]}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {entries.map((integration) => (
                  <IntegrationCard
                    key={integration.platform}
                    integration={integration}
                    onConnect={handleConnect}
                    onToggleActive={handleToggleActive}
                    onDisconnect={handleDisconnect}
                    onRotateSecret={handleRotateSecret}
                    isPending={isPending}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </PageState>

      <InboundSecretDialog issued={issued} onClose={handleCloseSecret} />
    </PageWrapper>
  );
}
