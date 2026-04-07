"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useVerifyEmail, useResendVerificationEmail } from "@/lib/hooks/auth-hooks";
import { CheckCircle2, Mail, Loader2, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [isVerified, setIsVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const hasVerified = useRef(false);

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

  const verifyEmail = useVerifyEmail();
  const resendVerification = useResendVerificationEmail();

  useEffect(() => {
    if (token && !hasVerified.current) {
      hasVerified.current = true;
      verifyEmail.mutate(
        { token },
        {
          onSuccess: () => {
            setIsVerified(true);
            toast.success("Email verified successfully!");
            setTimeout(() => router.push("/signin"), 2000);
          },
          onError: (error) => {
            toast.error(error.message || "Verification failed");
          },
        }
      );
    }
  }, [token]);

  const handleResend = () => {
    if (!email || cooldown > 0) return;
    resendVerification.mutate(
      { email },
      {
        onSuccess: () => {
          toast.success("Verification email resent!");
          startCooldown();
        },
        onError: () => {
          toast.error("Failed to resend email");
        },
      }
    );
  };

  if (isVerified) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto bg-green-500/15 p-4 rounded-full w-fit mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Email Verified!</h1>
          <p className="text-muted-foreground mt-2">Your email has been successfully verified</p>
        </div>

        <Card className="shadow-noir border-border">
          <CardContent className="pt-6 space-y-4">
            <div role="status" aria-live="polite" className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-green-600">Redirecting you to sign in page...</p>
            </div>
            <Link href="/signin" className="block">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verifyEmail.isPending) {
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

          <div role="status" className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-600">
              Click the link in the email to verify your account. The link will expire in 24 hours.
            </p>
          </div>

          <aside aria-label="Email delivery help" className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-xs text-amber-600">
              Didn&apos;t receive an email? Check your spam folder or contact support.
            </p>
          </aside>

          {email && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleResend}
              disabled={resendVerification.isPending || cooldown > 0}
              aria-label={cooldown > 0 ? `Resend available in ${cooldown} seconds` : "Resend verification link"}
            >
              {resendVerification.isPending ? (
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
