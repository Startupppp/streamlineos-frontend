"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { signIn, useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { useAcceptInvitation } from "@/hooks/common/auth-hooks";
import { getPasswordStrength, PASSWORD_REGEX, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { PasswordConfirmField } from "@/components/auth/password-confirm-field";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { InvitationIllustration } from "@/components/illustrations";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";

const invitationSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
      .regex(
        PASSWORD_REGEX,
        "Must include uppercase, lowercase, number, and special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type InvitationFormValues = z.infer<typeof invitationSchema>;

function InvitationCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ${className ?? ""}`}
    >
      {children}
    </Card>
  );
}

function InvitationHero({
  title,
  description,
}: {
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/60 bg-muted/25 px-6 py-7 text-center">
      <InvitationIllustration className="mx-auto mb-4 h-32 w-32" />
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function InvitationDetails({
  organizationName,
  role,
  accountEmail,
}: {
  organizationName: string;
  role: string;
  accountEmail?: string | null;
}) {
  return (
    <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/30 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-muted-foreground">Organization</span>
        <span className="truncate text-sm font-semibold text-foreground">{organizationName}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-muted-foreground">Role</span>
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
          {role}
        </span>
      </div>
      {accountEmail ? (
        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2.5">
          <span className="text-xs font-medium text-muted-foreground">Signed in as</span>
          <span className="truncate text-sm text-foreground">{accountEmail}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function InvitationPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [showPassword, setShowPassword] = useState(false);
  const { data: session, update } = useSession();

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleTogglePassword = useCallback(() => setShowPassword((v) => !v), []);
  const handleDecline = useCallback(() => router.push("/signin"), [router]);
  const handleConfirmPasswordChange = useCallback((val: string) => form.setValue("confirmPassword", val, { shouldDirty: true }), [form]);

  const { data: invitation, error: invitationError } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () =>
      apiClient.get<{
        email: string;
        organizationName: string;
        role: string;
        userExists: boolean;
      }>("/organization/invitations/validate", { token }),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (invitationError) {
      const message =
        invitationError instanceof Error
          ? invitationError.message
          : "Invalid invitation";
      toast.error(message);
      router.push("/signin");
    }
  }, [invitationError, router]);

  const acceptInvitation = useAcceptInvitation();

  const autoLoginWithToken = useCallback(
    async (autoLoginToken: string): Promise<void> => {
      const result = await signIn("credentials", {
        magicToken: autoLoginToken,
        redirect: false,
      });
      if (result?.ok) {
        window.location.href = "/post-signin";
      } else {
        router.push("/signin");
      }
    },
    [router],
  );

  const onSubmit = useCallback(
    (values: InvitationFormValues) => {
      if (!token || !invitation) {
        toast.error("Invalid invitation");
        return;
      }
      acceptInvitation.mutate(
        {
          token,
          firstName: values.firstName || undefined,
          lastName: values.lastName || undefined,
          password: values.password,
        },
        {
          onSuccess: async (data) => {
            toast.success("Account created! Signing you in…");
            if (data?.autoLoginToken) {
              await autoLoginWithToken(data.autoLoginToken);
            } else {
              router.push("/signin");
            }
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [token, invitation, acceptInvitation, router, autoLoginWithToken],
  );

  const handleExistingUserAccept = useCallback(() => {
    if (!token) return;
    if (!session) {
      router.push(`/signin?callbackUrl=/invitation/${token}`);
      return;
    }
    acceptInvitation.mutate(
      { token },
      {
        onSuccess: async (data) => {
          toast.success(
            `Joined ${invitation?.organizationName ?? "organization"}!`,
          );
          if (data?.autoLoginToken) {
            await autoLoginWithToken(data.autoLoginToken);
          } else {
            clearBackendTokenCache();
            await update().catch(() => null);
            router.push("/dashboard");
          }
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [token, session, router, acceptInvitation, invitation, update, autoLoginWithToken]);

  if (!invitation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">
          Verifying your invitation...
        </p>
      </div>
    );
  }

  if (invitation.userExists) {
    return (
      <motion.div
        className="w-full max-w-md"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <InvitationCard>
            <InvitationHero
              title="Join organization"
              description="Use your existing StreamlineOS account to accept this invite."
            />
            <CardContent className="space-y-5 px-6 pb-6 pt-5">
              <InvitationDetails
                organizationName={invitation.organizationName}
                role={invitation.role}
                accountEmail={session?.user?.email}
              />
              <div className="space-y-2">
                <Button
                  className="h-11 w-full gap-2 font-medium"
                  onClick={handleExistingUserAccept}
                  disabled={acceptInvitation.isPending}
                >
                  {acceptInvitation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {session ? "Accept & join" : "Sign in & join"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full text-muted-foreground hover:text-foreground"
                  onClick={handleDecline}
                  disabled={acceptInvitation.isPending}
                >
                  Decline invitation
                </Button>
              </div>
            </CardContent>
          </InvitationCard>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-md"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <InvitationCard>
          <InvitationHero
            title="Join organization"
            description={
              <>
                You&apos;ve been invited to join{" "}
                <span className="font-medium text-foreground">{invitation.organizationName}</span>.
              </>
            }
          />
          <CardContent className="px-6 pb-6 pt-5">
            <InvitationDetails
              organizationName={invitation.organizationName}
              role={invitation.role}
            />

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-5 space-y-4"
              aria-busy={acceptInvitation.isPending}
            >
              <div className="space-y-2">
                <Label className="text-foreground text-xs font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={invitation.email}
                    disabled
                    className="pl-10 bg-muted/30 cursor-not-allowed text-sm"
                    aria-label="Invitation email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className="text-foreground text-xs font-medium"
                  >
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    {...form.register("firstName")}
                    disabled={acceptInvitation.isPending}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className="text-foreground text-xs font-medium"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    {...form.register("lastName")}
                    disabled={acceptInvitation.isPending}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-foreground text-xs font-medium"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    {...form.register("password")}
                    disabled={acceptInvitation.isPending}
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.password}
                    aria-describedby={
                      form.formState.errors.password
                        ? "password-error"
                        : undefined
                    }
                    className="pl-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleTogglePassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {form.formState.errors.password.message}
                  </p>
                )}
                {password.length > 0 && (
                  <PasswordStrengthIndicator strength={strength} />
                )}
              </div>

              <PasswordConfirmField
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                password={password}
                disabled={acceptInvitation.isPending}
                showIcon
              />

              <div className="space-y-2 pt-1">
                <Button
                  type="submit"
                  className="h-11 w-full gap-2 font-medium"
                  disabled={acceptInvitation.isPending}
                >
                  {acceptInvitation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      Accept invitation
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full text-muted-foreground hover:text-foreground"
                  onClick={handleDecline}
                  disabled={acceptInvitation.isPending}
                >
                  Decline invitation
                </Button>
              </div>

              <p className="pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                By accepting, you&apos;ll get access to this organization&apos;s workspace,
                pipelines, and team tools.
              </p>
            </form>
          </CardContent>
        </InvitationCard>
      </motion.div>
    </motion.div>
  );
}
