"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  terms: z
    .boolean()
    .refine((v) => v === true, { message: "You must accept the terms" }),
});

const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

type FormValues = z.infer<typeof signupSchema>;
type OtpValues = z.infer<typeof otpSchema>;

const OTP_RESEND_COOLDOWN = 60;

function deriveFirstName(email: string): string {
  const prefix = email.split("@")[0] ?? "";
  const firstPart = prefix.split(/[._-]/)[0] ?? prefix;
  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase();
}

function deriveCompanyName(email: string): string {
  const domain = email.split("@")[1] ?? "";
  const parts = domain.split(".");
  const name = parts.length > 1 ? (parts[parts.length - 2] ?? parts[0]) : parts[0];
  if (!name) return "My Organization";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const hasGoogleProvider = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;

export default function SignupPage() {
  const router = useRouter();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(OTP_RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const googleSignUpMutation = useMutation({
    mutationFn: async () => {
      await signIn("google", { callbackUrl: "/org-setup" });
    },
    onError: () => {
      toast.error("Google sign-up failed. Please try again.");
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      terms: false,
    },
  });

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const registerMutation = useMutation({
    mutationFn: (data: FormValues) =>
      apiClient.post("/auth/register", {
        firstName: deriveFirstName(data.email),
        lastName: "",
        companyName: deriveCompanyName(data.email),
        email: data.email,
        plan: "STARTER",
      }),
    onSuccess: (_result, data) => {
      setRegisteredEmail(data.email);
      startCooldown();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (variables: { email: string; code: string }) =>
      apiClient.post<{ autoLoginToken: string }>("/auth/email-otp/verify", variables),
    onSuccess: async (data) => {
      const result = await signIn("credentials", {
        magicToken: data.autoLoginToken,
        redirect: false,
      });
      if (result?.ok) {
        router.push("/org-setup");
      } else {
        toast.error("Sign-in failed after verification. Please sign in manually.");
        router.push("/signin");
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      otpForm.reset({ code: "" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ ok: true }>("/auth/email-otp", { email }),
    onSuccess: () => {
      toast.success("A new code has been sent to your email.");
      startCooldown();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = useCallback((data: FormValues) => {
    registerMutation.mutate(data);
  }, [registerMutation]);

  const handleVerify = useCallback((values: OtpValues) => {
    if (!registeredEmail) return;
    verifyMutation.mutate({ email: registeredEmail, code: values.code });
  }, [verifyMutation, registeredEmail]);

  const handleResend = useCallback(() => {
    if (!registeredEmail || cooldown > 0) return;
    resendMutation.mutate(registeredEmail);
  }, [registeredEmail, cooldown, resendMutation]);

  const handleGoogleSignUp = useCallback(() => googleSignUpMutation.mutate(), [googleSignUpMutation]);
  const handleLinkClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  if (registeredEmail) {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-4 sm:mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="w-6 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-foreground">{registeredEmail}</span>.
            Enter it below to activate your account.
          </p>
        </div>

        <div className="rounded-xl p-4 space-y-4">
          <form onSubmit={otpForm.handleSubmit(handleVerify)} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium">Verification code</Label>
              <div className="flex justify-center">
                <Controller
                  control={otpForm.control}
                  name="code"
                  render={({ field }) => (
                    <InputOTP
                      maxLength={6}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={verifyMutation.isPending}
                      autoFocus
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  )}
                />
              </div>
              {otpForm.formState.errors.code && (
                <p role="alert" className="text-[12px] text-destructive text-center">
                  {otpForm.formState.errors.code.message}
                </p>
              )}
            </div>

            <LoadingButton
              type="submit"
              className="w-full h-9 text-sm font-medium"
              isPending={verifyMutation.isPending}
              loadingText="Verifying..."
            >
              Verify and continue
            </LoadingButton>
          </form>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resendMutation.isPending}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-up overflow-auto">
      <div className="mb-4 sm:mb-6 text-center">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          14-day free trial · No credit card required
        </p>
      </div>

      <div className="rounded-xl p-4 sm:p-6 space-y-3">
        {hasGoogleProvider && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full h-9 text-sm font-medium gap-2"
              onClick={handleGoogleSignUp}
              disabled={googleSignUpMutation.isPending}
            >
              {googleSignUpMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-[11px] text-muted-foreground/60">
                  or continue with email
                </span>
              </div>
            </div>
          </>
        )}

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-3"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium">
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
              placeholder="you@company.com"
              disabled={registerMutation.isPending}
              className={cn(
                "h-8 text-sm",
                form.formState.errors.email &&
                  "border-destructive focus-visible:ring-destructive/30",
              )}
            />
            {form.formState.errors.email && (
              <p className="text-[12px] text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-start gap-2.5 cursor-pointer group select-none">
              <input
                type="checkbox"
                {...form.register("terms")}
                className="mt-0.5 h-3.5 w-3.5 rounded border-border text-blue-600 accent-blue-600 cursor-pointer"
              />
              <span className="text-[12px] text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                I agree to the{" "}
                <Link
                  href="/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLinkClick}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLinkClick}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
            {form.formState.errors.terms && (
              <p className="text-[12px] text-destructive">
                {form.formState.errors.terms.message}
              </p>
            )}
          </div>

          <LoadingButton
            type="submit"
            className="w-full h-9 text-sm font-medium"
            isPending={registerMutation.isPending}
            loadingText="Creating account..."
          >
            Start free trial
          </LoadingButton>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-blue-600 hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>

        <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
          Encrypted in transit over TLS. Sessions are signed and rotated.
        </p>
      </div>
    </div>
  );
}
