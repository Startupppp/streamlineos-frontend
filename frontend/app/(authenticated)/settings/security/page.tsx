"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useChangePassword } from "@/hooks/api/auth";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const passwordRules = z
  .string()
  .min(12, "Minimum 12 characters")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[0-9]/, "Must include a number")
  .regex(/[^A-Za-z0-9]/, "Must include a special character");

const setPasswordSchema = z
  .object({
    newPassword: passwordRules,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordRules,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SetPasswordValues = z.infer<typeof setPasswordSchema>;
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function SetPasswordCard() {
  const form = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const changePassword = useChangePassword();

  function onSubmit(data: SetPasswordValues) {
    changePassword.mutate(
      { newPassword: data.newPassword },
      {
        onSuccess: () => {
          toast.success("Password set successfully");
          form.reset();
        },
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Set a Password</CardTitle>
        </div>
        <CardDescription>
          Your account uses Google Sign-In. You can add a password to also sign in with your email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={changePassword.isPending} className="w-full">
              {changePassword.isPending ? "Saving…" : "Set Password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const changePassword = useChangePassword();

  function onSubmit(data: ChangePasswordValues) {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          toast.success("Password changed successfully");
          form.reset();
        },
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Change Password</CardTitle>
        </div>
        <CardDescription>
          Choose a strong password with at least 12 characters including uppercase, lowercase,
          number, and special character.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={changePassword.isPending} className="w-full">
              {changePassword.isPending ? "Saving…" : "Change Password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function SecurityPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <PageWrapper title="Security" subtitle="Manage your password and account security settings.">
        <div className="max-w-lg space-y-4">
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  const isOAuthUser = session?.authProvider !== undefined && session.authProvider !== "credentials";

  return (
    <PageWrapper title="Security" subtitle="Manage your password and account security settings.">
      <div className="max-w-lg">
        {isOAuthUser ? <SetPasswordCard /> : <ChangePasswordCard />}
      </div>
    </PageWrapper>
  );
}
