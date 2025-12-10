"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { toast } from "sonner";
import { vaivammTrpcClient } from "../../../lib/trpc";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [isVerifying, setIsVerifying] = useState(!!token);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
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
  };

  if (isVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Verified!</CardTitle>
          <CardDescription>Your email has been successfully verified</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You can now sign in to your account.
          </p>
          <Link href="/signin">
            <Button className="w-full">Go to Sign In</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isVerifying) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying Email</CardTitle>
          <CardDescription>Please wait while we verify your email address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          {email
            ? `We've sent a verification email to ${email}`
            : "Please check your email for a verification link"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Click the link in the email to verify your account. The link will expire in 24 hours.
        </p>
        <div className="space-y-2">
          <Link href="/signin">
            <Button variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              if (email) {
                // Resend verification email
                vaivammTrpcClient.auth.resendVerificationEmail
                  .mutate({ email })
                  .then(() => toast.success("Verification email resent!"))
                  .catch(() => toast.error("Failed to resend email"));
              }
            }}
          >
            Resend Verification Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}

