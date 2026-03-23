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
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Mail, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof signinSchema>>({
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
    mutationFn: async (data: z.infer<typeof signinSchema>) => {
      if (!navigator.onLine) {
        throw new Error("No internet connection. Please check your network and try again.");
      }
      const callbackUrl = getCallbackUrl();
      try {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          callbackUrl,
          redirect: false,
        });
        if (result?.error) {
          throw new Error("Invalid email or password. Please check your credentials and try again.");
        }
        return result;
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new Error("No internet connection. Please check your network and try again.");
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      toast.success("Sign in successful! Redirecting...");
      if (result?.ok && result?.url) {
        window.location.href = result.url;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: z.infer<typeof signinSchema>) => {
    signInMutation.mutate(values);
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-2">Enter your details to access your account</p>
      </div>

      <Card className="shadow-noir border-border">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-busy={signInMutation.isPending}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...form.register("email")}
                  disabled={signInMutation.isPending}
                  className="pl-10 focus-visible:ring-primary"
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby={form.formState.errors.email ? "email-error" : undefined}
                />
              </div>
              {form.formState.errors.email && (
                <p id="email-error" role="alert" className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...form.register("password")}
                  disabled={signInMutation.isPending}
                  className="pl-10 pr-10 focus-visible:ring-primary"
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={form.formState.errors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p id="password-error" role="alert" className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={signInMutation.isPending}>
              {signInMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p className="text-xs">&copy; {new Date().getFullYear()} Vaivamm Capital. All rights reserved.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
