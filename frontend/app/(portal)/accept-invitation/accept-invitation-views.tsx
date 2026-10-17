"use client";

import { Loader2, AlertCircle } from "lucide-react";
import { PortalHeader } from "@/features/portal/components/portal-header";
import { BRAND_SUPPORT_EMAIL } from "@/lib/branding";

export function StatusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <PortalHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">{children}</div>
      </main>
    </div>
  );
}

export function LoadingView() {
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

export function ErrorView({ title, message }: ErrorViewProps) {
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

export function MissingTokenView({ reason }: { reason: string | null }) {
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

