"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcceptInvitation } from "@/hooks/api/portal/use-accept-invitation";
import { setPortalToken } from "@/lib/portal-api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { BRAND_SUPPORT_EMAIL } from "@/lib/branding";
import { ErrorView, LoadingView, MissingTokenView, StatusLayout } from "./accept-invitation-views";

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
        router.replace("/client-portal");
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
