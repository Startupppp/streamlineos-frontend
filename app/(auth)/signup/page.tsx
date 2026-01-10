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

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      toast.error(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
      );
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
    <div className="min-h-screen w-full bg-[#0f2b7f] dark:bg-background flex flex-col items-center justify-center p-4 relative transition-colors duration-300">
      <ThemeToggle className="absolute top-4 right-4 text-white hover:bg-white/10" />
      <div className="flex flex-col items-center mb-8">
          <div className="bg-white p-2 rounded-xl mb-4 shadow-lg">
             <Image src="/logo.svg" alt="Vaivamm Logo" width={64} height={64} className="rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white dark:text-foreground tracking-tight">Join Vaivamm CRM</h1>
          <p className="text-blue-100 dark:text-muted-foreground mt-2">Create your account to get started</p>
      </div>

      <Card className="w-full max-w-lg shadow-2xl border-0 bg-white dark:bg-card h-fit">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-primary">Create Account</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Start managing your HR and Projects today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={isLoading}
                  className="focus-visible:ring-primary dark:bg-background"
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
                   className="focus-visible:ring-primary dark:bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
                 className="focus-visible:ring-primary dark:bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                 className="focus-visible:ring-primary dark:bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
                 className="focus-visible:ring-primary dark:bg-background"
              />
            </div>
            <Button 
                type="submit" 
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
                disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-primary hover:underline">
              Sign in
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

