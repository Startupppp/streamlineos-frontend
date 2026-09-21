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
import { PmPageShell, PM_FILL_PANEL } from "@/components/pm-chrome";
import { AiChatPanel } from "./ai-chat-panel";
import { AiToolsRail, AiToolsMobileSheet } from "./ai-tools-rail";

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
      className="h-10 gap-1.5 text-xs text-muted-foreground hover:text-foreground sm:h-8"
      aria-label="Clear conversation"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
      Clear chat
    </Button>
  );
}

export function AiAssistantPage({ projectId }: AiAssistantPageProps) {
  const canUseAI = useCan("build:ai:use");
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
            illustration={<ShieldOff className="h-10 w-10 text-muted-foreground" />}
            title="Access restricted"
            description="You need the build:ai:use permission to use the AI Assistant."
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
            action={{ label: "View plans", href: "/settings/billing" }}
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
      subtitle={<span className="hidden sm:inline">{SUBTITLE}</span>}
      actionsInline
      noInternalScroll
      contentClassName="px-0"
      actions={
        <div className="flex items-center justify-end gap-2">
          <AiToolsMobileSheet {...sharedProps} />
          <ClearChatAction visible={hasMessages} onClear={handleClear} />
        </div>
      }
    >
      <PmPageShell className="min-h-0 flex-1 gap-0" withGlow={false}>
        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-background">
          <AiChatPanel
            {...sharedProps}
            clearSignal={clearSignal}
            onHasMessagesChange={handleHasMessagesChange}
          />
          <div className="hidden h-full shrink-0 md:flex">
            <AiToolsRail {...sharedProps} />
          </div>
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
