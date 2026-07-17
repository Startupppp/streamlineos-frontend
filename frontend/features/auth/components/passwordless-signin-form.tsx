"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
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
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showMagicLinkOption, setShowMagicLinkOption] = useState(false);
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

  const requestOtpMutation = useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ ok: true }>("/auth/email-otp", { email }),
    onSuccess: (_data, email) => {
      setSubmittedEmail(email);
      setStage("code");
      setOtpValue("");
      setShowMagicLinkOption(false);
      setMagicLinkSent(false);
      startCooldown();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (variables: { email: string; code: string }) =>
      apiClient.post<{ autoLoginToken: string }>("/auth/email-otp/verify", variables),
    onSuccess: async (data) => {
      const result = await signIn("credentials", {
        magicToken: data.autoLoginToken,
        redirect: false,
      });
      if (result?.ok) {
        router.push(getCallbackUrl());
      } else {
        toast.error("Sign-in failed. Please try again.");
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      setOtpValue("");
    },
  });

  const magicLinkMutation = useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ message: string }>("/auth/magic-link", { email }),
    onSuccess: () => {
      setMagicLinkSent(true);
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
      setOtpValue(value);
      if (value.length === 6 && !verifyOtpMutation.isPending) {
        verifyOtpMutation.mutate({ email: submittedEmail, code: value });
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
    setShowMagicLinkOption(false);
    setMagicLinkSent(false);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(0);
  }, []);

  const handleShowMagicLink = useCallback(() => {
    setShowMagicLinkOption(true);
  }, []);

  const handleSendMagicLink = useCallback(() => {
    magicLinkMutation.mutate(submittedEmail);
  }, [magicLinkMutation, submittedEmail]);

  if (stage === "code") {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium">Verification code</Label>
          <p className="text-[12px] text-muted-foreground">
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

        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
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
            <p className="text-[12px] text-emerald-600">
              Check your inbox — a sign-in link is on its way.
            </p>
          ) : showMagicLinkOption ? (
            <div className="space-y-2">
              <p className="text-[12px] text-muted-foreground">
                Send a sign-in link to{" "}
                <span className="font-medium text-foreground">{submittedEmail}</span>
              </p>
              <LoadingButton
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={handleSendMagicLink}
                isPending={magicLinkMutation.isPending}
                loadingText="Sending..."
              >
                Send sign-in link
              </LoadingButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleShowMagicLink}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Email me a sign-in link instead
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
        <Label htmlFor="email" className="text-[13px] font-medium">
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
          <p id="email-error" role="alert" className="text-[12px] text-destructive">
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
