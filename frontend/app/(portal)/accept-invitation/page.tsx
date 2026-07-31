"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalHeader } from "@/features/portal/components/portal-header";
import { useAcceptInvitation } from "@/hooks/api/portal/use-accept-invitation";
import { setPortalToken } from "@/lib/portal-api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { BRAND_SUPPORT_EMAIL } from "@/lib/branding";

function StatusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <PortalHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">{children}</div>
      </main>
    </div>
  );
}

function LoadingView() {
  return (
    <StatusLayout>
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/5">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Verifying your invitation…
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This will only take a moment.
          </p>
        </div>
      </div>
    </StatusLayout>
  );
}

interface ErrorViewProps {
  title: string;
  message: string;
}

function ErrorView({ title, message }: ErrorViewProps) {
  return (
    <StatusLayout>
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            {message}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href={`mailto:${BRAND_SUPPORT_EMAIL}`}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Contact support
          </a>
        </p>
      </div>
    </StatusLayout>
  );
}

function MissingTokenView({ reason }: { reason: string | null }) {
  const title =
    reason === "expired"
      ? "Session expired"
      : reason === "no_token"
        ? "No active session"
        : "Invalid invitation link";

  const message =
    reason === "expired"
      ? "Your portal session has expired. Please use the invitation link from your email to sign in again."
      : reason === "no_token"
        ? "You need a valid invitation link to access the client portal. Please check your email."
        : "This invitation link is missing or malformed. Please use the link from your invitation email.";

  return <ErrorView title={title} message={message} />;
}

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteToken = searchParams.get("token");
  const reason = searchParams.get("reason");

  const mutation = useAcceptInvitation();
  const calledRef = useRef(false);

  const handleRetry = useCallback(() => {
    calledRef.current = false;
    mutation.reset();
  }, [mutation]);

  useEffect(() => {
    if (!inviteToken) return;
    if (calledRef.current) return;
    calledRef.current = true;

    mutation.mutate(inviteToken, {
      onSuccess: (data) => {
        setPortalToken(data.token);
        router.replace("/portal/projects");
      },
    });
  }, [inviteToken, mutation, router]);

  if (!inviteToken) {
    return <MissingTokenView reason={reason} />;
  }

  if (mutation.isPending || (!mutation.isError && !mutation.isSuccess)) {
    return <LoadingView />;
  }

  if (mutation.isError) {
    const errorMessage = getErrorMessage(mutation.error);
    const isExpired =
      errorMessage.toLowerCase().includes("expired") ||
      errorMessage.toLowerCase().includes("invalid") ||
      errorMessage.toLowerCase().includes("not found");

    return (
      <StatusLayout>
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <MailOpen className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              {isExpired ? "Invitation expired" : "Could not accept invitation"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {isExpired
                ? "This invitation link has expired or has already been used. Please request a new one from your project team."
                : errorMessage}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            {!isExpired && (
              <Button size="sm" variant="outline" onClick={handleRetry}>
                Try again
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Need help?{" "}
              <a
                href={`mailto:${BRAND_SUPPORT_EMAIL}`}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </StatusLayout>
    );
  }

  return <LoadingView />;
}
