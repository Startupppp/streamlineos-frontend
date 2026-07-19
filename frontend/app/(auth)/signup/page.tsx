"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { OAuthButtons } from "@/features/auth";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  email: z.string().trim().email("Please enter a valid email"),
  companyName: z.string().trim().min(1, "Company name is required").max(120),
  terms: z.boolean().refine((v) => v === true, { message: "You must accept the terms" }),
});

type FormValues = z.infer<typeof signupSchema>;

const RESEND_COOLDOWN_SECONDS = 60;

export default function SignupPage() {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasGoogleProvider = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;
  const hasMicrosoftProvider = !!process.env.NEXT_PUBLIC_MICROSOFT_ENABLED;
  const hasOAuthProviders = hasGoogleProvider || hasMicrosoftProvider;

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
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

  const form = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      email: "",
      companyName: "",
      terms: false,
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiClient.post<{ success: true }>("/auth/register", {
        firstName: values.firstName,
        lastName: "",
        email: values.email,
        companyName: values.companyName,
        plan: "STARTER",
      }),
    onSuccess: (_data, values) => {
      setRegisteredEmail(values.email);
      startCooldown();
      toast.success("Account created! Check your email to verify.");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const resendMutation = useMutation({
    mutationFn: (email: string) =>
      apiClient.post("/auth/resend-verification", { email }),
    onSuccess: () => {
      toast.success("Verification email resent.");
      startCooldown();
    },
    onError: () => {
      toast.error("Failed to resend. Please try again.");
    },
  });

  const googleSignUpMutation = useMutation({
    mutationFn: async () => {
      await signIn("google", { callbackUrl: "/org-setup" });
    },
    onError: () => {
      toast.error("Google sign-up failed. Please try again.");
    },
  });

  const microsoftSignUpMutation = useMutation({
    mutationFn: async () => {
      await signIn("microsoft-entra-id", { callbackUrl: "/org-setup" });
    },
    onError: () => {
      toast.error("Microsoft sign-up failed. Please try again.");
    },
  });

  const handleSubmit = useCallback(
    (values: FormValues) => {
      registerMutation.mutate(values);
    },
    [registerMutation],
  );

  const handleResend = useCallback(() => {
    if (!registeredEmail || cooldown > 0) return;
    resendMutation.mutate(registeredEmail);
  }, [registeredEmail, cooldown, resendMutation]);

  if (registeredEmail) {
    return (
      <div className="w-full max-w-sm text-center animate-fade-up">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-semibold text-foreground">{registeredEmail}</span>
          . Click it to activate your account.
        </p>
        <div className="mt-6 space-y-3">
          <LoadingButton
            onClick={handleResend}
            disabled={cooldown > 0}
            isPending={resendMutation.isPending}
            variant="outline"
            className="w-full h-9 text-sm"
          >
            {cooldown > 0
              ? `Resend available in ${cooldown}s`
              : "Resend verification email"}
          </LoadingButton>
          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
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

      <div className="rounded-xl p-4 space-y-3">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-xs">
              First name
            </Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              className="h-9"
              {...form.register("firstName")}
            />
            {form.formState.errors.firstName && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-9"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-xs">
              Company name
            </Label>
            <Input
              id="companyName"
              autoComplete="organization"
              className="h-9"
              {...form.register("companyName")}
            />
            {form.formState.errors.companyName && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.companyName.message}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 pt-0.5">
            <Checkbox
              id="terms"
              checked={form.watch("terms")}
              onCheckedChange={(checked) =>
                form.setValue("terms", checked === true, { shouldValidate: true })
              }
              className="mt-0.5"
            />
            <Label htmlFor="terms" className="text-[11px] leading-relaxed font-normal text-muted-foreground">
              I agree to the{" "}
              <Link href="/legal/terms" className="text-blue-600 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </Label>
          </div>
          {form.formState.errors.terms && (
            <p className="text-[11px] text-destructive">
              {form.formState.errors.terms.message}
            </p>
          )}

          <LoadingButton
            type="submit"
            className="w-full h-9 text-sm"
            isPending={registerMutation.isPending}
          >
            Create account
          </LoadingButton>
        </form>

        {hasOAuthProviders && (
          <OAuthButtons
            hasGoogleProvider={hasGoogleProvider}
            hasMicrosoftProvider={hasMicrosoftProvider}
            isGooglePending={googleSignUpMutation.isPending}
            isMicrosoftPending={microsoftSignUpMutation.isPending}
            isSignInPending={registerMutation.isPending}
            onGoogleSignIn={() => googleSignUpMutation.mutate()}
            onMicrosoftSignIn={() => microsoftSignUpMutation.mutate()}
          />
        )}

        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link href="/signin" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
