"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Badge } from "../../../../components/ui/badge";
import { toast } from "sonner";
import { vaivammTrpcClient } from "../../../../lib/trpc";
import { ThemeToggle } from "../../../../components/theme-toggle";
import { Users, Mail, User, Shield, Loader2, Eye, EyeOff, PartyPopper } from "lucide-react";

export default function InvitationPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitation, setInvitation] = useState<{
    email: string;
    organizationName: string;
    role: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });

  const loadInvitation = useCallback(async () => {
    try {
      const data = await vaivammTrpcClient.organization.getInvitationByToken.query({ token });
      setInvitation(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invalid invitation";
      toast.error(message);
      router.push("/signin");
    }
  }, [token, router]);

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token, loadInvitation]);

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

    if (!token || !invitation) {
      toast.error("Invalid invitation");
      return;
    }

    setIsLoading(true);

    try {
      await vaivammTrpcClient.auth.acceptInvitation.mutate({
        token,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        password: formData.password,
      });

      toast.success("Account created! Redirecting to dashboard...");
      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.href = "/dashboard";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!invitation) {
    return (
      <div className="min-h-screen w-full bg-[#0f2b7f] dark:bg-background flex flex-col items-center justify-center p-4 relative transition-colors duration-300">
        <ThemeToggle className="absolute top-4 right-4 text-white hover:bg-white/10" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white p-2 rounded-xl mb-4 shadow-lg">
            <Image src="/logo.svg" alt="Vaivamm Logo" width={64} height={64} className="rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white dark:text-foreground tracking-tight">Loading Invitation</h1>
          <p className="text-blue-100 dark:text-muted-foreground mt-2">Please wait...</p>
        </div>

        <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-card">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your invitation...</p>
            </div>
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
        <h1 className="text-3xl font-bold text-white dark:text-foreground tracking-tight">You&apos;re Invited!</h1>
        <p className="text-blue-100 dark:text-muted-foreground mt-2">Join the team and start collaborating</p>
      </div>

      <Card className="w-full max-w-lg shadow-2xl border-0 bg-white dark:bg-card">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <PartyPopper className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-primary">Accept Invitation</CardTitle>
          <CardDescription className="text-muted-foreground">
            You have been invited to join
          </CardDescription>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg text-foreground">{invitation.organizationName}</span>
            <Badge variant="secondary" className="ml-2">{invitation.role}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Display */}
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={invitation.email} 
                  disabled 
                  className="pl-10 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This email will be used for your account
              </p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    disabled={isLoading}
                    className="pl-10 focus-visible:ring-primary dark:bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    disabled={isLoading}
                    className="pl-10 focus-visible:ring-primary dark:bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Password Fields */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                  className="pl-10 pr-10 focus-visible:ring-primary dark:bg-background"
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
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
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
                  className="pl-10 pr-10 focus-visible:ring-primary dark:bg-background"
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
              className="w-full h-11 text-base bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Accept & Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-white/40 text-sm">
        &copy; 2025 Vaivamm Capital
      </div>
    </div>
  );
}
