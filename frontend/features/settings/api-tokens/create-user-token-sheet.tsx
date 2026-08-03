"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  useCreateUserApiToken,
  type CreateUserApiTokenInput,
  type CreateUserApiTokenResponse,
} from "@/hooks/api/user-api-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { PermissionScopeSelector } from "./permission-scope-selector";

const userTokenFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  scopes: z.array(z.string()).min(1, "Select at least one permission"),
  expiresAt: z.string().optional(),
});

type UserTokenFormValues = z.infer<typeof userTokenFormSchema>;

interface CreateUserTokenSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (result: CreateUserApiTokenResponse) => void;
}

export function CreateUserTokenSheet({
  open,
  onOpenChange,
  onCreated,
}: CreateUserTokenSheetProps) {
  const create = useCreateUserApiToken();

  const form = useForm<UserTokenFormValues>({
    resolver: zodResolver(userTokenFormSchema),
    defaultValues: { name: "", scopes: [], expiresAt: "" },
  });

  const handleSubmit = useCallback(
    (values: UserTokenFormValues) => {
      const input: CreateUserApiTokenInput = {
        name: values.name,
        scopes: values.scopes,
        expiresAt: values.expiresAt || undefined,
      };
      create.mutate(input, {
        onSuccess: (result) => {
          form.reset();
          onCreated(result);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [create, form, onCreated],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 gap-1 border-b border-border px-6 py-4 text-left">
          <SheetTitle>New Personal Access Token</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          <Form {...form}>
            <form
              id="user-token-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Local Dev Token" {...field} />
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
                    <FormLabel>Expires At</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave blank for a non-expiring token.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Permissions <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormDescription>
                      The token can only do what you select here, and never more
                      than your own access allows.
                    </FormDescription>
                    <PermissionScopeSelector
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <LoadingButton
            type="submit"
            form="user-token-form"
            isPending={create.isPending}
            loadingText="Creating…"
          >
            Create Token
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
