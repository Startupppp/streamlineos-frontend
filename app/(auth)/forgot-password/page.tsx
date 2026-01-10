"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { toast } from "sonner";
import { vaivammTrpcClient } from "../../../lib/trpc";
import { ThemeToggle } from "../../../components/theme-toggle";
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await vaivammTrpcClient.auth.forgotPassword.mutate({ email });
      setSent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen w-full bg-[#0f2b7f] dark:bg-background flex flex-col items-center justify-center p-4 relative transition-colors duration-300">
        <ThemeToggle className="absolute top-4 right-4 text-white hover:bg-white/10" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white p-2 rounded-xl mb-4 shadow-lg">
            <Image src="/logo.svg" alt="Vaivamm Logo" width={64} height={64} className="rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white dark:text-foreground tracking-tight">Check Your Email</h1>
          <p className="text-blue-100 dark:text-muted-foreground mt-2">Password reset instructions sent</p>
        </div>

        <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-card">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-fit mb-2">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-primary">Email Sent!</CardTitle>
            <CardDescription className="text-muted-foreground">
              We have sent a password reset link to
            </CardDescription>
            <p className="font-medium text-foreground">{email}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
            </div>
            <Link href="/signin" className="block">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-white/40 text-sm">
          &copy; 2025 Vaivamm Capital
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0f2b7f] dark:bg-background flex flex-col items-center justify-center p-4 relative transition-colors duration-300">
      <ThemeToggle className="absolute top-4 right-4 text-white hover:bg-white/10" />
      
      <div className="flex flex-col items-center mb-8">
        <div className="bg-white p-2 rounded-xl mb-4 shadow-lg">
          <Image src="/logo.svg" alt="Vaivamm Logo" width={64} height={64} className="rounded-lg" />
        </div>
        <h1 className="text-3xl font-bold text-white dark:text-foreground tracking-tight">Forgot Password?</h1>
        <p className="text-blue-100 dark:text-muted-foreground mt-2">No worries, we will help you reset it</p>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-card">
        <CardHeader className="space-y-1">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center text-primary">Reset Password</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your email address and we will send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 focus-visible:ring-primary dark:bg-background"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/signin" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-white/40 text-sm">
        &copy; 2025 Vaivamm Capital
      </div>
    </div>
  );
}
