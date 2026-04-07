"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof signinSchema>;

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "" },
  });

  const getCallbackUrl = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("callbackUrl");
      if (url && url.startsWith("/")) return url;
    }
    return "/dashboard";
  };

  const signInMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!navigator.onLine) {
        throw new Error("No internet connection. Check your network and try again.");
      }
      try {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          callbackUrl: getCallbackUrl(),
          redirect: false,
        });
        if (result?.error) {
          throw new Error("Invalid email or password.");
        }
        return result;
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new Error("No internet connection. Check your network and try again.");
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      toast.success("Welcome back!");
      if (result?.ok) {
        const target =
          result.url && result.url.length > 0 ? result.url : getCallbackUrl();
        window.location.href = target;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isPending = signInMutation.isPending;

  return (
    <div className="w-full max-w-sm animate-fade-up">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sign in to your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your credentials to continue
        </p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card shadow-soft p-6 space-y-5">
        <form
          onSubmit={form.handleSubmit((v) => signInMutation.mutate(v))}
          aria-busy={isPending}
          noValidate
          className="space-y-4"
        >
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@vaivamm.com"
              {...form.register("email")}
              disabled={isPending}
              className={cn(
                "h-9 text-sm",
                form.formState.errors.email && "border-destructive focus-visible:ring-destructive/30"
              )}
              aria-invalid={!!form.formState.errors.email}
              aria-describedby={form.formState.errors.email ? "email-error" : undefined}
            />
            {form.formState.errors.email && (
              <p id="email-error" role="alert" className="text-[12px] text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px] font-medium">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                {...form.register("password")}
                disabled={isPending}
                className={cn(
                  "h-9 text-sm pr-9",
                  form.formState.errors.password && "border-destructive focus-visible:ring-destructive/30"
                )}
                aria-invalid={!!form.formState.errors.password}
                aria-describedby={form.formState.errors.password ? "pw-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {form.formState.errors.password && (
              <p id="pw-error" role="alert" className="text-[12px] text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-9 text-sm font-medium gap-2 mt-1"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-2 text-[11px] text-muted-foreground/60">
              Secure sign-in
            </span>
          </div>
        </div>

        {/* Security note */}
        <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
          Your session is protected with end-to-end encryption.
          <br />
          Never share your credentials with anyone.
        </p>
      </div>
    </div>
  );
}
