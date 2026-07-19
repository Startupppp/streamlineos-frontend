"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthenticateSignSession, useRequestSignOtp } from "@/hooks/api/sign/public";
import type { SignAuthMethod } from "@/types/sign";

const accessCodeSchema = z.object({
  accessCode: z.string().min(1, "Access code is required"),
});

const otpSchema = z.object({
  otpCode: z.string().min(1, "One-time code is required").max(6),
});

type AccessCodeValues = z.infer<typeof accessCodeSchema>;
type OtpValues = z.infer<typeof otpSchema>;

function AccessCodeForm({ token }: { token: string }) {
  const authenticate = useAuthenticateSignSession(token);
  const form = useForm<AccessCodeValues>({
    resolver: zodResolver(accessCodeSchema),
    defaultValues: { accessCode: "" },
  });

  async function handleSubmit(values: AccessCodeValues) {
    try {
      await authenticate.mutateAsync({ accessCode: values.accessCode });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-full text-left">
        <FormField
          control={form.control}
          name="accessCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Access code <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton type="submit" className="w-full" isPending={authenticate.isPending} loadingText="Verifying…">
          Continue
        </LoadingButton>
      </form>
    </Form>
  );
}

function OtpForm({ token }: { token: string }) {
  const authenticate = useAuthenticateSignSession(token);
  const requestOtp = useRequestSignOtp(token);
  const form = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otpCode: "" },
  });

  async function handleRequestOtp() {
    try {
      await requestOtp.mutateAsync();
      toast.success("Code sent — check your email");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleSubmit(values: OtpValues) {
    try {
      await authenticate.mutateAsync({ otpCode: values.otpCode });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (!requestOtp.isSuccess) {
    return (
      <LoadingButton className="w-full" onClick={handleRequestOtp} isPending={requestOtp.isPending} loadingText="Sending…">
        Send me a code
      </LoadingButton>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-full text-left">
        <FormField
          control={form.control}
          name="otpCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                One-time code <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" maxLength={6} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton type="submit" className="w-full" isPending={authenticate.isPending} loadingText="Verifying…">
          Continue
        </LoadingButton>
      </form>
    </Form>
  );
}

export function AuthScreen({ token, authMethod, recipientName }: { token: string; authMethod: SignAuthMethod; recipientName: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6 bg-background">
      <div className="rounded-full bg-primary/10 p-4">
        <ShieldCheck className="size-8 text-primary" />
      </div>
      <div className="w-full max-w-sm space-y-4 text-center">
        <div>
          <h1 className="text-lg font-semibold">Verify it&apos;s you, {recipientName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {authMethod === "access_code"
              ? "Enter the access code you were given."
              : "We'll send a one-time code to your email."}
          </p>
        </div>
        {authMethod === "access_code" ? (
          <AccessCodeForm token={token} />
        ) : (
          <OtpForm token={token} />
        )}
      </div>
    </div>
  );
}
