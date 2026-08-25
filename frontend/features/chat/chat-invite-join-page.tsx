"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MessageSquareText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useJoinViaInviteLink } from "@/hooks/api";

export function ChatInviteJoinPage({ token }: { token: string }) {
  const router = useRouter();
  const joinViaInviteLink = useJoinViaInviteLink();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    joinViaInviteLink.mutate(token, {
      onSuccess: (result) => {
        router.replace(`/chat?channel=${result.channelId}`);
      },
      onError: (error) => {
        setErrorMessage(getErrorMessage(error));
      },
    });
  }, [token, joinViaInviteLink, router]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
        <MessageSquareText className="h-6 w-6 text-white" />
      </div>

      {errorMessage ? (
        <>
          <XCircle className="w-8 text-destructive" />
          <div>
            <p className="text-sm font-semibold">This invite link doesn&apos;t work</p>
            <p className="text-label text-muted-foreground mt-1 max-w-sm">{errorMessage}</p>
          </div>
          <Button onClick={() => router.replace("/chat")} className="mt-2">
            Go to Discuss
          </Button>
        </>
      ) : joinViaInviteLink.isSuccess ? (
        <>
          <CheckCircle2 className="w-8 text-status-success-ink" />
          <p className="text-sm font-semibold">Joined — taking you there...</p>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-label text-muted-foreground">Joining channel...</p>
        </>
      )}
    </div>
  );
}
