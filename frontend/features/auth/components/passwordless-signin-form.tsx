"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { readRetryAfterSeconds } from "@/lib/parse-auth-error";
import { signInWithMagicToken } from "@/hooks/common/auth-hooks";
import { useRequestOtp, useVerifyOtp, useSendMagicLink } from "@/hooks/api/auth";
import { cn } from "@/lib/utils";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type EmailValues = z.infer<typeof emailSchema>;

const OTP_RESEND_COOLDOWN = 30;

const OTP_SUPERSEDED_NOTICE =
  "A newer code was sent. Any earlier code has stopped working — use the most recent email.";

interface PasswordlessSigninFormProps {
  getCallbackUrl: () => string;
}

export function PasswordlessSigninForm({ getCallbackUrl }: PasswordlessSigninFormProps) {
  const [stage, setStage] = useState<"email" | "code">("email");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [codeSuperseded, setCodeSuperseded] = useState(false);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const codeStageActiveRef = useRef(false);
  const resendRequestedRef = useRef(false);
  const otpFieldRef = useRef<HTMLInputElement>(null);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      codeStageActiveRef.current = false;
    };
  }, []);

  useEffect(function focusCodeFieldOnStageEntry() {
    if (stage !== "code") return;
    otpFieldRef.current?.focus();
  }, [stage]);

  useEffect(function focusCodeFieldAfterVerifyError() {
    if (!verifyError) return;
    otpFieldRef.current?.focus();
  }, [verifyError]);

  const startCooldown = useCallback((seconds: number = OTP_RESEND_COOLDOWN) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const applyRateLimitCooldown = useCallback(
    (error: unknown) => {
      if (!isApiError(error) || error.status !== 429) return;
      startCooldown(readRetryAfterSeconds(error) ?? OTP_RESEND_COOLDOWN);
    },
    [startCooldown],
  );

  const requestOtpMutation = useRequestOtp({
    onSuccess: (data, email) => {
      const wasResend = resendRequestedRef.current;
      resendRequestedRef.current = false;
      setSubmittedEmail(email);
      codeStageActiveRef.current = true;
      setStage("code");
      setOtpValue("");
      setMagicLinkSent(false);
      setVerifyError(null);
      setCodeSuperseded(wasResend);
      startCooldown();
      toast.success(getErrorMessage(data));
    },
    onError: (error) => {
      resendRequestedRef.current = false;
      applyRateLimitCooldown(error);
      toast.error(getErrorMessage(error));
    },
  });

  const verifyOtpMutation = useVerifyOtp({
    onSuccess: async (data) => {
      if (!codeStageActiveRef.current) return;
      const outcome = await signInWithMagicToken(data.autoLoginToken);
      if (outcome.status === "signed-in") {
        window.location.assign(getCallbackUrl());
        return;
      }
      if (!codeStageActiveRef.current) return;
      if (outcome.status === "indeterminate") {
        setVerifyError("Sign-in status is uncertain. Please try signing in again.");
        setOtpValue("");
        return;
      }
      setVerifyError("Could not complete sign-in. Request a new code and try again.");
      toast.error("Could not complete sign-in. Request a new code and try again.");
      setOtpValue("");
    },
    onError: (error) => {
      setVerifyError(getErrorMessage(error));
      applyRateLimitCooldown(error);
      toast.error(getErrorMessage(error));
      // A server verdict (the code was wrong, expired or rate-limited) means this
      // code is spent, so the field is cleared and a new one must be requested.
      // A request that never reached a verdict leaves the code still valid, so the
      // digits stay and the Verify control becomes the retry — which is the only
      // state in which that control is reachable, since reaching six digits
      // otherwise auto-submits in the same render.
      if (isApiError(error) && typeof error.status === "number") setOtpValue("");
    },
  });

  const magicLinkMutation = useSendMagicLink({
    onSuccess: (data) => {
      setMagicLinkSent(true);
      toast.success(getErrorMessage(data));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleEmailSubmit = useCallback(
    (values: EmailValues) => {
      requestOtpMutation.mutate(values.email);
    },
    [requestOtpMutation],
  );

  const handleOtpChange = useCallback(
    (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      setOtpValue(digits);
      setVerifyError(null);
      if (digits.length === 6 && !verifyOtpMutation.isPending) {
        verifyOtpMutation.mutate({ email: submittedEmail, code: digits });
      }
    },
    [submittedEmail, verifyOtpMutation],
  );

  const handleVerify = useCallback(() => {
    if (otpValue.length === 6 && !verifyOtpMutation.isPending) {
      verifyOtpMutation.mutate({ email: submittedEmail, code: otpValue });
    }
  }, [otpValue, submittedEmail, verifyOtpMutation]);

  const handleResend = useCallback(() => {
    if (resendCooldown > 0 || verifyOtpMutation.isPending) return;
    resendRequestedRef.current = true;
    requestOtpMutation.mutate(submittedEmail);
  }, [resendCooldown, requestOtpMutation, submittedEmail, verifyOtpMutation.isPending]);

  const handleBack = useCallback(() => {
    codeStageActiveRef.current = false;
    resendRequestedRef.current = false;
    setStage("email");
    setSubmittedEmail("");
    setOtpValue("");
    setMagicLinkSent(false);
    setVerifyError(null);
    setCodeSuperseded(false);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(0);
  }, []);

  const handleSendMagicLink = useCallback(() => {
    if (magicLinkMutation.isPending || magicLinkSent) return;
    magicLinkMutation.mutate(submittedEmail);
  }, [magicLinkMutation, magicLinkSent, submittedEmail]);

  if (stage === "code") {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="otp-code" className="text-label font-medium">
            Verification code
          </Label>
          <p id="otp-code-hint" className="text-xs text-muted-foreground">
            Sent to{" "}
            <span className="font-medium text-foreground">{submittedEmail}</span>
          </p>
          {codeSuperseded && (
            <p className="text-xs text-status-warning-ink">
              {OTP_SUPERSEDED_NOTICE}
            </p>
          )}
          <div className="flex justify-center py-2">
            <InputOTP
              ref={otpFieldRef}
              id="otp-code"
              aria-label="Verification code"
              aria-describedby={
                verifyError ? "otp-code-error otp-code-hint" : "otp-code-hint"
              }
              aria-invalid={!!verifyError}
              maxLength={6}
              value={otpValue}
              onChange={handleOtpChange}
              autoComplete="one-time-code"
              disabled={verifyOtpMutation.isPending}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        {verifyError && (
          <p
            id="otp-code-error"
            role="alert"
            aria-live="assertive"
            className="text-xs text-destructive text-center"
          >
            {verifyError}
          </p>
        )}

        {otpValue.length === 6 && (
          <LoadingButton
            className="w-full h-9 text-sm font-medium"
            onClick={handleVerify}
            isPending={verifyOtpMutation.isPending}
            loadingText="Verifying..."
          >
            Verify code
          </LoadingButton>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleBack}
            className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            Use a different email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || requestOtpMutation.isPending || verifyOtpMutation.isPending}
            className="hover:text-foreground transition-colors underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>

        <div className="text-center pt-1">
          {magicLinkSent ? (
            <p className="text-xs text-status-success-ink">
              Check your inbox — a sign-in link is on its way.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={magicLinkMutation.isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {magicLinkMutation.isPending
                ? "Sending sign-in link..."
                : "Email me a sign-in link instead"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
      noValidate
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-label font-medium">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          autoFocus
          {...emailForm.register("email")}
          disabled={requestOtpMutation.isPending}
          className={cn(
            "h-9 text-sm",
            emailForm.formState.errors.email &&
              "border-destructive focus-visible:ring-destructive/30",
          )}
          aria-invalid={!!emailForm.formState.errors.email}
          aria-describedby={emailForm.formState.errors.email ? "email-error" : undefined}
        />
        {emailForm.formState.errors.email && (
          <p id="email-error" role="alert" className="text-xs text-destructive">
            {emailForm.formState.errors.email.message}
          </p>
        )}
      </div>

      <LoadingButton
        type="submit"
        className="w-full h-9 text-sm font-medium"
        isPending={requestOtpMutation.isPending}
        loadingText="Sending code..."
      >
        Continue
      </LoadingButton>
    </form>
  );
}
