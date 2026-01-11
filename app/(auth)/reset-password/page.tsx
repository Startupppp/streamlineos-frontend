"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { toast } from "sonner";
import { vaivammTrpcClient } from "../../../lib/trpc";
import { Shield, Loader2, KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link");
      router.push("/forgot-password");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      toast.error(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
      );
      return;
    }

    if (!token) {
      toast.error("Invalid reset token");
      return;
    }

    setIsLoading(true);

    try {
      await vaivammTrpcClient.auth.resetPassword.mutate({
        token,
        password: formData.password,
      });

      setIsSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => {
        router.push("/signin");
      }, 2000);
    } catch (error: unknown) {
      setIsSuccess(false);
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-green-100 p-4 rounded-full w-fit mb-2">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-primary">Password Reset!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your password has been successfully reset
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

  return (
    <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
      <CardHeader className="space-y-1">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center text-primary">Create New Password</CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Enter a strong password for your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">New Password</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                className="pl-10 pr-10 focus-visible:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">Confirm New Password</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
                className="pl-10 pr-10 focus-visible:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button 
            type="submit" 
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
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

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full bg-[#0f2b7f] flex flex-col items-center justify-center p-4 relative">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-white p-2 rounded-xl mb-4 shadow-lg">
          <Image src="/logo.svg" alt="Vaivamm Logo" width={64} height={64} className="rounded-lg" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Reset Password</h1>
        <p className="text-blue-100 mt-2">Create a new secure password</p>
      </div>

      <Suspense fallback={<LoadingCard />}>
        <ResetPasswordForm />
      </Suspense>
      
      <div className="mt-8 text-white/40 text-sm">
        &copy; 2025 Vaivamm Capital
      </div>
    </div>
  );
}
