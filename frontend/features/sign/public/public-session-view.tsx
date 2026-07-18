"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { useSignPublicSession } from "@/hooks/api/sign/public";
import { TerminalStateScreen } from "./terminal-state-screen";
import { AuthScreen } from "./auth-screen";
import { ConsentScreen } from "./consent-screen";
import { SigningWorkspace } from "./signing-workspace";
import { CompletionScreen } from "./completion-screen";

export function PublicSessionView({ token }: { token: string }) {
  const { data: session, isLoading, isError, refetch } = useSignPublicSession(token);
  const [justCompleted, setJustCompleted] = useState<{ everyoneDone: boolean } | null>(null);

  if (isLoading || !session) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-6">
        <ErrorState title="This signing link is invalid" onRetry={() => void refetch()} />
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

  return <SigningWorkspace token={token} session={session} onCompleted={(everyoneDone) => setJustCompleted({ everyoneDone })} />;
}
