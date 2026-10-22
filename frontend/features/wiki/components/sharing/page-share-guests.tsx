"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { Checkbox } from "@/components/ui/checkbox";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateKbGuestGrant } from "@/hooks/api/kb/sharing";

const guestSchema = z.object({
  email: z.string().email("Enter a valid email"),
  expiresAt: z.string().min(1, "Choose an expiry date"),
  allowDownload: z.boolean(),
});

type GuestFormValues = z.infer<typeof guestSchema>;

interface PageShareGuestsProps {
  pageId: number;
  externalSharingEnabled: boolean;
}

export function PageShareGuests({ pageId, externalSharingEnabled }: PageShareGuestsProps) {
  const createGrant = useCreateKbGuestGrant();
  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: { email: "", expiresAt: "", allowDownload: false },
  });

  function handleSubmit(values: GuestFormValues) {
    createGrant.mutate(
      { pageId, ...values },
      {
        onSuccess: () => {
          toast.success("Guest invited");
          form.reset();
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 403) {
            toast.error("External sharing is disabled for this page.");
          } else if (isApiError(error) && error.status === 409) {
            toast.error("This guest already has access.");
          } else {
            toast.error(getErrorMessage(error));
          }
        },
      },
    );
  }

  if (!externalSharingEnabled) {
    return (
      <p className="text-xs text-muted-foreground">
        External sharing is disabled for this page.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Guest email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="guest@example.com" className="h-8 text-xs" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expiresAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Expires</FormLabel>
              <FormControl>
                <Input {...field} type="date" className="h-8 text-xs" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowDownload"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-xs font-normal">Allow download</FormLabel>
            </FormItem>
          )}
        />
        <LoadingButton
          type="submit"
          size="sm"
          className="h-8 text-xs"
          isPending={createGrant.isPending}
        >
          Invite guest
        </LoadingButton>
      </form>
    </Form>
  );
}
