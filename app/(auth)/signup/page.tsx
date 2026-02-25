"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSignUp } from "@/lib/hooks/auth-hooks";
import { getPasswordStrength, PASSWORD_REGEX } from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { PasswordConfirmField } from "@/components/auth/password-confirm-field";
import { Loader2, Eye, EyeOff, BarChart3, Plug, ArrowRight, ShieldCheck, Quote } from "lucide-react";

const signupSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Please enter a valid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(PASSWORD_REGEX, "Must include uppercase, lowercase, number, and special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
  });

  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const signUp = useSignUp({
    onSuccess: () => {
      toast.success("Account created! Please check your email to verify your account.");
      const email = form.getValues("email");
      window.location.href = "/verify-email?email=" + encodeURIComponent(email);
    },
    onError: (error) => {
      toast.error(error.message || "An error occurred");
    },
  });

  const onSubmit = (values: SignupFormValues) => {
    signUp.mutate({
      email: values.email,
      password: values.password,
      firstName: values.firstName || undefined,
      lastName: values.lastName || undefined,
    });
  };

  return (
    <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-0 min-h-[600px]">
      <div className="hidden lg:flex flex-col justify-between bg-secondary rounded-l-2xl p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(189,136,44,0.1)_0%,_transparent_60%)]" />
        <div className="relative space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Image src="/logo.svg" alt="Vaivamm" width={24} height={24} className="rounded bg-white/90 p-0.5" />
              <span className="text-sm font-semibold text-white/70">Vaivamm CRM</span>
            </div>
            <p className="text-xs text-white/40 tracking-wide uppercase">B2B Relationship Management</p>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight leading-tight mb-3">
              Elevate your sales pipeline strategy.
            </h2>
            <p className="text-white/50 leading-relaxed">
              Join thousands of professional teams using Vaivamm to close deals faster and build lasting business relationships.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-white/[0.06] rounded-xl p-4 border border-white/[0.08]">
              <div className="h-9 w-9 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-4 w-4 text-gold" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Advanced Analytics</p>
                <p className="text-xs text-white/40 mt-0.5">Real-time data visualization for your entire sales cycle.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/[0.06] rounded-xl p-4 border border-white/[0.08]">
              <div className="h-9 w-9 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
                <Plug className="h-4 w-4 text-gold" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Omnichannel Sync</p>
                <p className="text-xs text-white/40 mt-0.5">Integrate seamlessly with your existing enterprise tech stack.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-8">
          <div className="bg-white/[0.06] rounded-xl p-5 border border-white/[0.08]">
            <Quote className="h-4 w-4 text-gold/50 mb-2" />
            <p className="text-sm text-white/70 italic leading-relaxed">
              &ldquo;Vaivamm transformed how our global sales team operates.&rdquo;
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="h-7 w-7 rounded-full bg-gold/30" />
              <div>
                <p className="text-xs font-semibold text-white/80">Sarah J.</p>
                <p className="text-xs text-white/40">Head of Growth</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-noir border-border rounded-l-none lg:rounded-r-2xl lg:rounded-l-none rounded-2xl">
        <CardContent className="p-8 lg:p-10 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Get started today</h1>
              <p className="text-sm text-muted-foreground mt-1">Create your professional account</p>
            </div>
            <Link href="/signin" className="text-sm text-primary hover:underline font-medium">
              Log in
            </Link>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  {...form.register("firstName")}
                  disabled={signUp.isPending}
                  className="focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  {...form.register("lastName")}
                  disabled={signUp.isPending}
                  className="focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                {...form.register("email")}
                disabled={signUp.isPending}
                className="focus-visible:ring-primary"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  {...form.register("password")}
                  disabled={signUp.isPending}
                  className="pr-10 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
              {password.length > 0 && <PasswordStrengthIndicator strength={strength} />}
            </div>

            <PasswordConfirmField
              value={confirmPassword}
              onChange={(val) => form.setValue("confirmPassword", val, { shouldDirty: true })}
              password={password}
              disabled={signUp.isPending}
            />

            <Button type="submit" className="w-full" disabled={signUp.isPending}>
              {signUp.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-2 bg-muted/50 rounded-lg p-3 border border-border">
            <ShieldCheck className="h-4 w-4 text-gold flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your data is secured with enterprise-grade SSL encryption and compliant with GDPR/SOC2 standards.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
