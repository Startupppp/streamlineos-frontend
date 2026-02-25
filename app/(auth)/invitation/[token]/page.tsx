"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { vaivammTrpcClient } from "@/lib/trpc";
import { useAcceptInvitation } from "@/lib/hooks/auth-hooks";
import { getPasswordStrength, PASSWORD_REGEX } from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { PasswordConfirmField } from "@/components/auth/password-confirm-field";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { Users, Mail, User, Lock, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";

const invitationSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(PASSWORD_REGEX, "Must include uppercase, lowercase, number, and special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type InvitationFormValues = z.infer<typeof invitationSchema>;

export default function InvitationPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { firstName: "", lastName: "", password: "", confirmPassword: "" },
  });

  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const { data: invitation, error: invitationError } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => vaivammTrpcClient.organization.getInvitationByToken.query({ token }),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (invitationError) {
      const message = invitationError instanceof Error ? invitationError.message : "Invalid invitation";
      toast.error(message);
      router.push("/signin");
    }
  }, [invitationError, router]);

  const acceptInvitation = useAcceptInvitation({
    onSuccess: () => {
      toast.success("Account created! Redirecting to dashboard...");
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      toast.error(error.message || "An error occurred");
    },
  });

  const onSubmit = (values: InvitationFormValues) => {
    if (!token || !invitation) {
      toast.error("Invalid invitation");
      return;
    }
    acceptInvitation.mutate({
      token,
      firstName: values.firstName || undefined,
      lastName: values.lastName || undefined,
      password: values.password,
    });
  };

  if (!invitation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying your invitation...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-lg"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="text-center mb-8">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Join Organization</h1>
        <p className="text-muted-foreground mt-2">
          You&apos;ve been invited to join <span className="font-semibold text-foreground">{invitation.organizationName}</span>
        </p>
      </motion.div>

      <motion.div variants={fadeUp}>
      <Card className="shadow-noir border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border mb-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned Role</p>
                <p className="text-sm font-medium text-foreground">{invitation.role}</p>
              </div>
            </div>
            <Badge variant="secondary">{invitation.role}</Badge>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={invitation.email} disabled className="pl-10 bg-muted/30 cursor-not-allowed" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  {...form.register("firstName")}
                  disabled={acceptInvitation.isPending}
                  className="focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  {...form.register("lastName")}
                  disabled={acceptInvitation.isPending}
                  className="focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  {...form.register("password")}
                  disabled={acceptInvitation.isPending}
                  className="pl-10 pr-10 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
              {password.length > 0 && <PasswordStrengthIndicator strength={strength} />}
            </div>

            <PasswordConfirmField
              value={confirmPassword}
              onChange={(val) => form.setValue("confirmPassword", val, { shouldDirty: true })}
              password={password}
              disabled={acceptInvitation.isPending}
              showIcon
            />

            <Button type="submit" className="w-full" disabled={acceptInvitation.isPending}>
              {acceptInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Accept Invitation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By accepting this invitation, you will have access to shared leads, deal pipelines, and team analytics within this organization.
            </p>
          </form>
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
}
