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
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

type EmailValues = z.infer<typeof emailSchema>;
type CodeValues = z.infer<typeof codeSchema>;

const OTP_RESEND_COOLDOWN = 30;

interface EmailOtpFormProps {
  isVisible: boolean;
  onShow: () => void;
  getCallbackUrl: () => string;
}

export function EmailOtpForm({ isVisible, onShow, getCallbackUrl }: EmailOtpFormProps) {
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
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
      startCooldown();
      codeForm.reset({ code: "" });
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
      codeForm.reset({ code: "" });
    },
  });

  const handleEmailSubmit = useCallback(
    (values: EmailValues) => {
      requestOtpMutation.mutate(values.email);
    },
    [requestOtpMutation],
  );

  const handleCodeSubmit = useCallback(
    (values: CodeValues) => {
      verifyOtpMutation.mutate({ email: submittedEmail, code: values.code });
    },
    [verifyOtpMutation, submittedEmail],
  );

  const handleResend = useCallback(() => {
    if (resendCooldown > 0) return;
    requestOtpMutation.mutate(submittedEmail);
  }, [resendCooldown, requestOtpMutation, submittedEmail]);

  const handleBack = useCallback(() => {
    setStage("email");
    setSubmittedEmail("");
    codeForm.reset({ code: "" });
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(0);
  }, [codeForm]);

  if (!isVisible) {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={onShow}
          className="text-[12px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          Email me a one-time code
        </button>
      </div>
    );
  }

  if (stage === "code") {
    return (
      <div className="space-y-3">
        <form
          onSubmit={codeForm.handleSubmit(handleCodeSubmit)}
          noValidate
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="otp-code" className="text-[13px] font-medium">
              Enter the 6-digit code
            </Label>
            <p className="text-[12px] text-muted-foreground">
              Sent to <span className="font-medium text-foreground">{submittedEmail}</span>
            </p>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              autoFocus
              {...codeForm.register("code")}
              disabled={verifyOtpMutation.isPending}
              className={cn(
                "h-8 text-sm text-center font-mono tracking-[0.25em]",
                codeForm.formState.errors.code &&
                  "border-destructive focus-visible:ring-destructive/30",
              )}
              aria-invalid={!!codeForm.formState.errors.code}
              aria-describedby={codeForm.formState.errors.code ? "otp-code-error" : undefined}
            />
            {codeForm.formState.errors.code && (
              <p id="otp-code-error" role="alert" className="text-[12px] text-destructive">
                {codeForm.formState.errors.code.message}
              </p>
            )}
          </div>

          <LoadingButton
            type="submit"
            className="w-full h-9 text-sm font-medium"
            isPending={verifyOtpMutation.isPending}
            loadingText="Verifying..."
          >
            Verify code
          </LoadingButton>
        </form>

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
      </div>
    );
  }

  return (
    <form
      onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
      noValidate
      className="space-y-2"
    >
      <div className="space-y-1.5">
        <Label htmlFor="otp-email" className="text-[13px] font-medium">
          Email for one-time code
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="otp-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            autoFocus
            {...emailForm.register("email")}
            disabled={requestOtpMutation.isPending}
            className={cn(
              "h-8 text-sm flex-1",
              emailForm.formState.errors.email &&
                "border-destructive focus-visible:ring-destructive/30",
            )}
            aria-invalid={!!emailForm.formState.errors.email}
            aria-describedby={emailForm.formState.errors.email ? "otp-email-error" : undefined}
          />
          <LoadingButton
            type="submit"
            size="sm"
            className="shrink-0 h-8"
            isPending={requestOtpMutation.isPending}
            loadingText="Sending..."
          >
            Send code
          </LoadingButton>
        </div>
        {emailForm.formState.errors.email && (
          <p id="otp-email-error" role="alert" className="text-[12px] text-destructive">
            {emailForm.formState.errors.email.message}
          </p>
        )}
      </div>
    </form>
  );
}
