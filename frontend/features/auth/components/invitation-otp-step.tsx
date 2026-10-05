"use client";

import type { FormEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InvitationCard,
  InvitationHero,
  CardContent,
} from "@/components/auth/invitation-card";
import { useMotionVariants } from "@/lib/motion-variants";

type OtpValues = { emailOtp: string };

interface InvitationOtpStepProps {
  invitedEmail: string;
  otpForm: UseFormReturn<OtpValues>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  isVerifyPending: boolean;
  isResendPending: boolean;
}

export function InvitationOtpStep({
  invitedEmail,
  otpForm,
  onSubmit,
  onResend,
  isVerifyPending,
  isResendPending,
}: InvitationOtpStepProps) {
  const { staggerContainer, fadeUp } = useMotionVariants();
  return (
    <motion.div
      className="w-full max-w-[480px]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <InvitationCard>
          <InvitationHero
            title="Verify your email"
            description={`Enter the 6-digit code sent to ${invitedEmail} to confirm your identity.`}
          />
          <CardContent className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <Form {...otpForm}>
              <form
                onSubmit={onSubmit}
                className="space-y-4"
                aria-busy={isVerifyPending}
              >
                <FormField
                  control={otpForm.control}
                  name="emailOtp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-xs font-medium">
                        Verification code
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit code"
                          autoComplete="one-time-code"
                          disabled={isVerifyPending}
                          className="text-center text-lg font-mono tracking-widest"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5 pt-0.5">
                  <LoadingButton
                    type="submit"
                    className="h-11 w-full gap-2 font-medium"
                    isPending={isVerifyPending}
                    loadingText="Verifying..."
                  >
                    Verify & create account
                    <ArrowRight className="h-4 w-4" />
                  </LoadingButton>

                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-full text-muted-foreground hover:text-foreground"
                    onClick={onResend}
                    disabled={isVerifyPending || isResendPending}
                  >
                    Resend code
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </InvitationCard>
      </motion.div>
    </motion.div>
  );
}
