"use client";

import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEntityChannel } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";

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

  if (error) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/chat")}>
          Go to Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <span className="sr-only">Opening project chat…</span>
    </div>
  );
}
