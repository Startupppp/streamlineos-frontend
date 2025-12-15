"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
// We will create this action next
import { resetPassword } from "@/server/actions/auth-actions";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";

const formSchema = z.object({
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(50),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const result = await resetPassword(values.password);
    setLoading(false);

    if (result.success) {
      toast.success("Password updated successfully!");
      // Force reload to refresh session cookie via middleware/provider logic?
      // Actually we need to re-login or refresh session.
      // Easiest is to sign out and ask them to sign in again with new password, or refresh token.
      // But user expects "Flow end -> Dashboard".
      // To satisfy middleware, session "forceChangePassword" must become false.
      // Updates to DB are done. But session is stale.
      // We can use update() from useSession hook, but that client side.
      // Or we can just redirect to /api/auth/signout then /signin.
      // Let's try attempting to push to dashboard, monitoring if middleware blocks it or if we can refresh session.
      
      // Better flow: "Password changed. Please login again."
      await signOut({ callbackUrl: "/signin" });
    } else {
      toast.error(result.error || "Failed to update password");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Change Password</h1>
          <p className="text-gray-500 text-sm mt-1">
            Your organization requires you to change your password before continuing.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
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
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
            
            <Button
                variant="link"
                className="w-full text-xs text-muted-foreground"
                type="button"
                onClick={() => signOut({ callbackUrl: "/signin" })}
              >
                Sign out
              </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
