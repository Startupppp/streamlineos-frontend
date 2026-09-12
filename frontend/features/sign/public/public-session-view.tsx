"use client";

import { useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignPublicSession } from "@/hooks/api/sign/public";
import { TerminalStateScreen } from "./terminal-state-screen";
import { AuthScreen } from "./auth-screen";
import { ConsentScreen } from "./consent-screen";
import { SigningWorkspace } from "./signing-workspace";
import { CompletionScreen } from "./completion-screen";

export function PublicSessionView({ token }: { token: string }) {
  const { data: session, isLoading, isError, error, refetch } = useSignPublicSession(token);
  const [justCompleted, setJustCompleted] = useState<{ everyoneDone: boolean } | null>(null);

  function handleRetry() {
    void refetch();
  }

  function handleCompleted(everyoneDone: boolean) {
    setJustCompleted({ everyoneDone });
  }

  if (isError) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-6">
        <ErrorState
          title="This signing link is invalid"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg space-y-4" aria-busy="true" aria-label="Loading your signing session">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (justCompleted) {
    return <CompletionScreen envelopeTitle={session.envelope?.title ?? session.envelopeTitle ?? "this document"} everyoneDone={justCompleted.everyoneDone} />;
  }

  if (session.state !== "active") {
    return <TerminalStateScreen state={session.state} envelopeTitle={session.envelope?.title ?? session.envelopeTitle} />;
  }

  if (!session.recipient?.authenticated) {
    return <AuthScreen token={token} authMethod={session.recipient?.authMethod ?? "email_link"} recipientName={session.recipient?.name ?? "there"} />;
  }

  if (!session.recipient.consentAccepted) {
    return <ConsentScreen token={token} envelopeTitle={session.envelope?.title ?? ""} senderName={session.sender?.name ?? "The sender"} />;
  }

  return <SigningWorkspace token={token} session={session} onCompleted={handleCompleted} />;
}
