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
  InvitationDetails,
  DeclineInvitationDialog,
  CardContent,
} from "@/components/auth/invitation-card";
import { useMotionVariants } from "@/lib/motion-variants";

type NameValues = { firstName?: string; lastName?: string };

interface InvitationNewUserStepProps {
  organizationName: string;
  invitedEmail: string;
  role: string;
  nameForm: UseFormReturn<NameValues>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isOtpPending: boolean;
  isDeclinePending: boolean;
  declineOpen: boolean;
  onSetDeclineOpen: (open: boolean) => void;
  onDecline: () => void;
  onConfirmDecline: () => void;
}

export function InvitationNewUserStep({
  organizationName,
  invitedEmail,
  role,
  nameForm,
  onSubmit,
  isOtpPending,
  isDeclinePending,
  declineOpen,
  onSetDeclineOpen,
  onDecline,
  onConfirmDecline,
}: InvitationNewUserStepProps) {
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
            title="You're invited"
            description={`Create your account to join ${organizationName}.`}
          />
          <CardContent className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <InvitationDetails
              organizationName={organizationName}
              role={role}
              invitedEmail={invitedEmail}
            />

            <Form {...nameForm}>
              <form
                onSubmit={onSubmit}
                className="mt-4 space-y-3.5"
                aria-busy={isOtpPending}
              >
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  <FormField
                    control={nameForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-xs font-medium">
                          First name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            type="text"
                            placeholder="Your first name"
                            autoComplete="given-name"
                            disabled={isOtpPending}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={nameForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-xs font-medium">
                          Last name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            type="text"
                            placeholder="Your last name"
                            autoComplete="family-name"
                            disabled={isOtpPending}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-1.5 pt-0.5">
                  <LoadingButton
                    type="submit"
                    className="h-11 w-full gap-2 font-medium"
                    isPending={isOtpPending}
                    loadingText="Sending verification code..."
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </LoadingButton>

                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-full text-muted-foreground hover:text-foreground"
                    onClick={onDecline}
                    disabled={isOtpPending || isDeclinePending}
                  >
                    Decline invitation
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </InvitationCard>
      </motion.div>
      <DeclineInvitationDialog
        open={declineOpen}
        onOpenChange={onSetDeclineOpen}
        organizationName={organizationName}
        isPending={isDeclinePending}
        onConfirm={onConfirmDecline}
      />
    </motion.div>
  );
}
