"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { toast } from "sonner";
import { vaivammTrpcClient } from "../../../lib/trpc";
import { CheckCircle2, Mail, Loader2, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [isVerifying, setIsVerifying] = useState(!!token);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const verifyEmail = useCallback(async () => {
    if (!token) return;

    try {
      await vaivammTrpcClient.auth.verifyEmail.mutate({ token });
      setIsVerified(true);
      toast.success("Email verified successfully!");
      setTimeout(() => {
        router.push("/signin");
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Verification failed";
      toast.error(message);
      setIsVerifying(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token, verifyEmail]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setIsResending(true);
    try {
      await vaivammTrpcClient.auth.resendVerificationEmail.mutate({ email });
      toast.success("Verification email resent!");
      startCooldown();
    } catch {
      toast.error("Failed to resend email");
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-green-100 p-4 rounded-full w-fit mb-2">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-primary">Email Verified!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your email has been successfully verified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              Redirecting you to sign in page...
            </p>
          </div>
          <Link href="/signin" className="block">
            <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              Go to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isVerifying) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <CardTitle className="text-2xl text-primary">Verifying Email</CardTitle>
          <CardDescription className="text-muted-foreground">
            Please wait while we verify your email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-pulse text-sm text-muted-foreground">
                This will only take a moment...
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl text-primary">Verify Your Email</CardTitle>
        <CardDescription className="text-muted-foreground">
          {email
            ? `We have sent a verification email to`
            : "Please check your email for a verification link"}
        </CardDescription>
        {email && <p className="font-medium text-foreground">{email}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            Click the link in the email to verify your account. The link will expire in 24 hours.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Can&apos;t find the email? Check your spam or junk folder. The email is sent from noreply@vaivamm.com.
          </p>
        </div>
        <div className="space-y-2">
          <Link href="/signin" className="block">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
          {email && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
            >
              {isResending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {cooldown > 0
                ? `Resend available in ${cooldown}s`
                : "Resend Verification Email"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen w-full bg-[#0f2b7f] flex flex-col items-center justify-center p-4 relative">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-white p-2 rounded-xl mb-4 shadow-lg">
          <Image src="/logo.svg" alt="Vaivamm Logo" width={64} height={64} className="rounded-lg" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Email Verification</h1>
        <p className="text-blue-100 mt-2">Almost there! Just one more step</p>
      </div>

      <Suspense fallback={<LoadingCard />}>
        <VerifyEmailForm />
      </Suspense>

      <div className="mt-8 text-white/40 text-sm">
        &copy; 2025 Vaivamm Capital
      </div>
    </div>
  );
}
