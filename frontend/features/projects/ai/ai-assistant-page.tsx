"use client";

import { useCallback, useState } from "react";
import { ShieldOff } from "lucide-react";
import { Trash2Icon, SparklesIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { useFeature } from "@/lib/billing/use-feature";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PmPageShell, PM_FILL_PANEL } from "@/features/projects/shared/pm-chrome";
import { AiChatPanel } from "./ai-chat-panel";
import { AiToolsRail } from "./ai-tools-rail";

interface AiAssistantPageProps {
  projectId: number;
}

const SUBTITLE = "Analyze, plan, and get answers about this project.";

function ClearChatAction({
  visible,
  onClear,
}: {
  visible: boolean;
  onClear: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  if (!visible) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClear}
      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      aria-label="Clear conversation"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
      Clear chat
    </Button>
  );
}

export function AiAssistantPage({ projectId }: AiAssistantPageProps) {
  const canUseAI = useCan("projects:ai:use");
  const feature = useFeature("ai.project-manager");
  const [hasMessages, setHasMessages] = useState(false);
  const [clearSignal, setClearSignal] = useState(0);
  const { iconRef: emptyIconRef, hoverHandlers: emptyHover } = useAnimatedIcon();

  const handleClear = useCallback(() => {
    setClearSignal((n) => n + 1);
    setHasMessages(false);
  }, []);

  const handleHasMessagesChange = useCallback((has: boolean) => {
    setHasMessages(has);
  }, []);

  if (!canUseAI) {
    return (
      <PageWrapper title="AI Assistant" subtitle={SUBTITLE}>
        <PmPageShell>
          <EmptyState
            className={PM_FILL_PANEL}
            illustration={<ShieldOff className="h-10 w-10 text-muted-foreground/40" />}
            title="Access restricted"
            description="You need the projects:ai:use permission to use the AI Assistant."
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (!feature.enabled) {
    return (
      <PageWrapper title="AI Assistant" subtitle={SUBTITLE}>
        <PmPageShell>
          <EmptyState
            className={PM_FILL_PANEL}
            illustration={
              <span className="inline-flex" {...emptyHover}>
                <SparklesIcon ref={emptyIconRef} size={40} className="text-primary/40" />
              </span>
            }
            title="Upgrade to unlock AI features"
            description={`AI Project Manager is available on the ${feature.requiredPlan ?? "PROFESSIONAL"} plan and above.`}
            action={{ label: "View plans", href: "/billing" }}
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const sharedProps = {
    projectId,
    featureEnabled: feature.enabled,
    requiredPlan: feature.requiredPlan,
  };

  return (
    <PageWrapper
      title="AI Assistant"
      subtitle={SUBTITLE}
      noInternalScroll
      contentClassName="px-0"
      actions={<ClearChatAction visible={hasMessages} onClear={handleClear} />}
    >
      <PmPageShell className="h-full gap-0" withGlow={false}>
        <div className="relative flex h-full min-h-0 overflow-hidden bg-background">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            <AiChatPanel
              {...sharedProps}
              clearSignal={clearSignal}
              onHasMessagesChange={handleHasMessagesChange}
            />
            <div className="shrink-0 md:hidden">
              <AiToolsRail {...sharedProps} variant="stacked" />
            </div>
          </div>
          <div className="hidden h-full md:flex">
            <AiToolsRail {...sharedProps} variant="sidebar" />
          </div>
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
