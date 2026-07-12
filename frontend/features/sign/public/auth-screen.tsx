"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthenticateSignSession, useRequestSignOtp } from "@/hooks/api/sign/public";
import type { SignAuthMethod } from "@/types/sign";

export function AuthScreen({ token, authMethod, recipientName }: { token: string; authMethod: SignAuthMethod; recipientName: string }) {
  const [accessCode, setAccessCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const authenticate = useAuthenticateSignSession(token);
  const requestOtp = useRequestSignOtp(token);

  async function handleRequestOtp() {
    try {
      await requestOtp.mutateAsync();
      setOtpRequested(true);
      toast.success("Code sent — check your email");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleSubmit() {
    try {
      await authenticate.mutateAsync(authMethod === "access_code" ? { accessCode } : { otpCode });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-background">
      <div className="rounded-full bg-sky-500/10 p-4">
        <ShieldCheck className="size-8 text-sky-600 dark:text-sky-400" />
      </div>
      <div className="w-full max-w-sm space-y-4 text-center">
        <div>
          <h1 className="text-lg font-semibold">Verify it's you, {recipientName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {authMethod === "access_code" ? "Enter the access code you were given." : "We'll send a one-time code to your email."}
          </p>
        </div>

        {authMethod === "access_code" ? (
          <div className="space-y-2 text-left">
            <Label htmlFor="access-code">Access code</Label>
            <Input id="access-code" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} autoFocus />
          </div>
        ) : otpRequested ? (
          <div className="space-y-2 text-left">
            <Label htmlFor="otp-code">One-time code</Label>
            <Input id="otp-code" inputMode="numeric" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} autoFocus />
          </div>
        ) : (
          <LoadingButton className="w-full" onClick={handleRequestOtp} isPending={requestOtp.isPending} loadingText="Sending…">
            Send me a code
          </LoadingButton>
        )}

        {(authMethod === "access_code" || otpRequested) && (
          <LoadingButton className="w-full" onClick={handleSubmit} isPending={authenticate.isPending} loadingText="Verifying…">
            Continue
          </LoadingButton>
        )}
      </div>
    </div>
  );
}
