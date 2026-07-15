"use client";

import { use, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEntityChannel } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmPanel } from "@/features/projects/shared/pm-chrome";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectChatRoute({ params }: PageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const { data: channel, error } = useEntityChannel("project", projectId);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current || !channel?.id) return;
    redirectedRef.current = true;
    router.replace(`/chat?channel=${channel.id}`);
  }, [channel?.id, router]);

  const handleGoToChat = useCallback(() => {
    router.push("/chat");
  }, [router]);

  if (error) {
    return (
      <PageWrapper title="Chat" subtitle="Opening project conversation">
        <PmPageShell>
          <PmPanel className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 p-8 text-center" solid>
            <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
            <Button variant="outline" size="sm" onClick={handleGoToChat}>
              Go to Chat
            </Button>
          </PmPanel>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Chat" subtitle="Opening project conversation">
      <PmPageShell>
        <PmPanel className="flex flex-1 min-h-0 items-center justify-center gap-2 p-8" solid>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="sr-only">Opening project chat…</span>
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
