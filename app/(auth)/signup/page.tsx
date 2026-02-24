"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { vaivammTrpcClient } from "@/lib/trpc";
import { Loader2, Eye, EyeOff, Check, X, BarChart3, Plug, ArrowRight, ShieldCheck, Quote } from "lucide-react";

function getPasswordStrength(password: string) {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  let level: "weak" | "fair" | "good" | "strong" = "weak";
  let color = "bg-red-500";
  if (passed >= 5) { level = "strong"; color = "bg-green-500"; }
  else if (passed >= 4) { level = "good"; color = "bg-blue-500"; }
  else if (passed >= 3) { level = "fair"; color = "bg-yellow-500"; }
  return { checks, passed, level, color, percentage: (passed / 5) * 100 };
}

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      toast.error("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
      setIsLoading(false);
      return;
    }

    try {
      await vaivammTrpcClient.auth.signUp.mutate({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
      });

      toast.success("Account created! Please check your email to verify your account.");
      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.href = "/verify-email?email=" + encodeURIComponent(formData.email);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={isLoading}
                  className="focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={isLoading}
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
                className="focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                  className="pr-10 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.percentage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium capitalize ${
                      strength.level === "strong" ? "text-green-600" :
                      strength.level === "good" ? "text-blue-600" :
                      strength.level === "fair" ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {strength.level}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { key: "length" as const, label: "8+ characters" },
                      { key: "uppercase" as const, label: "Uppercase" },
                      { key: "lowercase" as const, label: "Lowercase" },
                      { key: "number" as const, label: "Number" },
                      { key: "special" as const, label: "Special char" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1">
                        {strength.checks[key] ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-gray-300" />
                        )}
                        <span className={`text-xs ${strength.checks[key] ? "text-green-600" : "text-muted-foreground"}`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={isLoading}
                  className={`pr-10 focus-visible:ring-primary ${
                    passwordsMatch ? "border-green-500 focus-visible:ring-green-500" :
                    passwordsMismatch ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordsMismatch && <p className="text-xs text-red-500">Passwords do not match</p>}
              {passwordsMatch && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
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
