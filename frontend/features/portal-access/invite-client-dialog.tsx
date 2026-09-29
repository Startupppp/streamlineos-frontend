"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AppDialog } from "@/components/shared/app-dialog";
import { useInviteClient } from "@/hooks/api/portal-access/grants";
import type { PortalMembershipRow } from "@/hooks/api/portal-access/portal-access-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  inviteClientFormSchema,
  type InviteClientFormValues,
} from "./invite-client-schema";

const EMPTY_DEFAULTS: InviteClientFormValues = {
  firstName: "",
  lastName: "",
  email: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: (membership: PortalMembershipRow) => void;
}

export function InviteClientDialog({ open, onOpenChange, onInvited }: Props) {
  const invite = useInviteClient();

  const form = useForm<InviteClientFormValues>({
    resolver: zodResolver(inviteClientFormSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(EMPTY_DEFAULTS);
    }
  }, [open, form]);

  function handleSubmit(values: InviteClientFormValues) {
    invite.mutate(
      {
        firstName: values.firstName,
        lastName: values.lastName || undefined,
        email: values.email || undefined,
      },
      {
        onSuccess: (membership) => {
          toast.success("Client invited and portal access activated");
          onInvited(membership);
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleCancel() {
    onOpenChange(false);
  }

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={invite.isPending}
      >
        Cancel
      </Button>
      <LoadingButton
        type="submit"
        form="invite-client-form"
        size="sm"
        isPending={invite.isPending}
        loadingText="Inviting…"
      >
        Invite Client
      </LoadingButton>
    </>
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite Client"
      description="Create a client contact and activate their portal access immediately."
      footer={footer}
    >
      <Form {...form}>
        <form
          id="invite-client-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Jane" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Last name{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Smith" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="jane@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppDialog>
  );
}
