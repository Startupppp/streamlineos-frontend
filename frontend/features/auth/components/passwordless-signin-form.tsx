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
import { signInWithMagicToken } from "@/hooks/common/auth-hooks";
import { useRequestOtp, useVerifyOtp, useSendMagicLink } from "@/hooks/api/auth";
import { cn } from "@/lib/utils";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type EmailValues = z.infer<typeof emailSchema>;

const OTP_RESEND_COOLDOWN = 30;

interface PasswordlessSigninFormProps {
  getCallbackUrl: () => string;
}

export function PasswordlessSigninForm({ getCallbackUrl }: PasswordlessSigninFormProps) {
  const [stage, setStage] = useState<"email" | "code">("email");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setResendCooldown(OTP_RESEND_COOLDOWN);
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

  const requestOtpMutation = useRequestOtp({
    onSuccess: (data, email) => {
      setSubmittedEmail(email);
      setStage("code");
      setOtpValue("");
      setMagicLinkSent(false);
      startCooldown();
      toast.success(getErrorMessage(data));
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const verifyOtpMutation = useVerifyOtp({
    onSuccess: async (data) => {
      const signedIn = await signInWithMagicToken(data.autoLoginToken);
      if (signedIn) {
        window.location.assign(getCallbackUrl());
        return;
      }
      toast.error("Could not complete sign-in. Request a new code and try again.");
      setOtpValue("");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      setOtpValue("");
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
      if (digits.length === 6 && !verifyOtpMutation.isPending) {
        verifyOtpMutation.mutate({ email: submittedEmail, code: digits });
      }
    },
    [submittedEmail, verifyOtpMutation],
  );

  const handleVerify = useCallback(() => {
    if (otpValue.length === 6) {
      verifyOtpMutation.mutate({ email: submittedEmail, code: otpValue });
    }
  }, [otpValue, submittedEmail, verifyOtpMutation]);

  const handleResend = useCallback(() => {
    if (resendCooldown > 0) return;
    requestOtpMutation.mutate(submittedEmail);
  }, [resendCooldown, requestOtpMutation, submittedEmail]);

  const handleBack = useCallback(() => {
    setStage("email");
    setSubmittedEmail("");
    setOtpValue("");
    setMagicLinkSent(false);
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
          <Label className="text-label font-medium">Verification code</Label>
          <p className="text-xs text-muted-foreground">
            Sent to{" "}
            <span className="font-medium text-foreground">{submittedEmail}</span>
          </p>
          <div className="flex justify-center py-2">
            <InputOTP
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

        {otpValue.length > 0 && otpValue.length < 6 && (
          <LoadingButton
            className="w-full h-9 text-sm font-medium"
            onClick={handleVerify}
            disabled={otpValue.length !== 6}
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
            disabled={resendCooldown > 0 || requestOtpMutation.isPending}
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
            "h-8 text-sm",
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
