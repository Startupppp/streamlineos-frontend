"use client";

import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PmPanel, PmSection } from "@/components/pm-chrome";
import { AgentTokensSection } from "@/features/build/settings/agent-tokens-section";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";

interface ProjectSettingsCredentialsPageProps {
  projectId: number;
}

export function ProjectSettingsCredentialsPage({ projectId: _projectId }: ProjectSettingsCredentialsPageProps) {
  const pageState = usePageState({
    permission: "settings:api-tokens:read",
    isLoading: false,
    isError: false,
    error: undefined,
  });

  return (
    <PageWrapper
      title="Credentials"
      subtitle="Manage API tokens and secrets for agent access"
    >
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          }
          className="flex-1"
        >
          <div className="flex flex-col gap-4">
            <PmSection index={0}>
              <PmPanel className="p-4" solid>
                <div className="mb-3 border-b border-border pb-3">
                  <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                    API Tokens
                  </h3>
                  <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
                    Issue tokens to allow agents and external services to
                    authenticate with the Streamline API on behalf of this account.
                    Each token inherits the issuing member&rsquo;s permissions.
                  </p>
                </div>
                <AgentTokensSection />
              </PmPanel>
            </PmSection>
          </div>
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
