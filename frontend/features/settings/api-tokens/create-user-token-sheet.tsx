"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useCreateUserApiToken,
  type CreateUserApiTokenInput,
  type CreateUserApiTokenResponse,
} from "@/hooks/api/user-api-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
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
import { TokenExpiresAtField } from "./token-expires-at-field";
import { datetimeLocalAfterDays } from "@/lib/date-utils";
import {
  userTokenFormSchema,
  type UserTokenFormValues,
} from "./create-user-token-schema";

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
    defaultValues: { name: "", scopes: [], expiresAt: datetimeLocalAfterDays(30) },
  });

  const handleSubmit = useCallback(
    (values: UserTokenFormValues) => {
      const input: CreateUserApiTokenInput = {
        name: values.name,
        scopes: values.scopes,
        expiresAt: values.expiresAt,
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

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md sm:w-full">
        <SheetHeader className="shrink-0 gap-1 border-b border-border px-6 py-4 text-left">
          <SheetTitle>New Personal Access Token</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          <Form {...form}>
            <form
              id="user-token-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="min-w-0 space-y-4"
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
                    <FormLabel>Expires At <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <TokenExpiresAtField
                        value={field.value}
                        onChange={field.onChange}
                        maxDays={366}
                      />
                    </FormControl>
                    <FormDescription>
                      Required for safety. Personal tokens can be valid for up to one year.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem className="min-w-0">
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
        <SheetFooter className="shrink-0 border-border bg-muted/30 px-6 py-4">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCancel}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              form="user-token-form"
              className="w-full"
              isPending={create.isPending}
              loadingText="Creating…"
            >
              Create Token
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
