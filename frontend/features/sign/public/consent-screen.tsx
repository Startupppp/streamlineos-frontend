"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSignature } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAcceptSignConsent } from "@/hooks/api/sign/public";

const DISCLOSURE_VERSION = "v1";

export function ConsentScreen({ token, envelopeTitle, senderName }: { token: string; envelopeTitle: string; senderName: string }) {
  const [agreed, setAgreed] = useState(false);
  const acceptConsent = useAcceptSignConsent(token);

  async function handleContinue() {
    try {
      await acceptConsent.mutateAsync(DISCLOSURE_VERSION);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-background">
      <div className="rounded-full bg-primary/10 p-4">
        <FileSignature className="size-8 text-primary" />
      </div>
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-semibold">Review &amp; consent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {senderName} sent you <strong>{envelopeTitle}</strong> to sign electronically.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
          <p>By continuing, you agree to:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Sign this document electronically instead of on paper.</li>
            <li>Conduct this transaction electronically.</li>
            <li>Receive your signed copy electronically.</li>
          </ul>
          <p>Your consent, IP address, browser, and the time of this action will be recorded as part of the signing evidence.</p>
        </div>
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <Checkbox checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} className="mt-0.5" />
          <span>I have read and agree to sign electronically.</span>
        </label>
        <LoadingButton className="w-full" disabled={!agreed} onClick={handleContinue} isPending={acceptConsent.isPending} loadingText="Continuing…">
          Continue to document
        </LoadingButton>
      </div>
    </div>
  );
}
