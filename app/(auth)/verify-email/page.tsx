"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { vaivammTrpcClient } from "@/lib/trpc";
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
    if (token) verifyEmail();
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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto bg-green-100 p-4 rounded-full w-fit mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Email Verified!</h1>
          <p className="text-muted-foreground mt-2">Your email has been successfully verified</p>
        </div>

        <Card className="shadow-noir border-border">
          <CardContent className="pt-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">Redirecting you to sign in page...</p>
            </div>
            <Link href="/signin" className="block">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Verifying Email</h1>
          <p className="text-muted-foreground mt-2">Please wait while we verify your email address</p>
        </div>

        <Card className="shadow-noir border-border">
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <p className="animate-pulse text-sm text-muted-foreground">This will only take a moment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Check your email</h1>
        <p className="text-muted-foreground mt-2">
          We&apos;ve sent a verification link to your address. Please click the link to verify your account and get started.
        </p>
      </div>

      <Card className="shadow-noir border-border">
        <CardContent className="pt-6 space-y-4">
          {email && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Verification email sent to</p>
              <p className="font-medium text-foreground mt-1">{email}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              Click the link in the email to verify your account. The link will expire in 24 hours.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Didn&apos;t receive an email? Check your spam folder or contact support.
            </p>
          </div>

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
              {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend Verification Link"}
            </Button>
          )}

          <Link href="/signin" className="block">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-noir border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
