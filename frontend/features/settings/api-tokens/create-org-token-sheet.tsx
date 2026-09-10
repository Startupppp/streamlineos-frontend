"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useCreateApiToken,
  type CreateApiTokenInput,
  type CreateApiTokenResponse,
} from "@/hooks/api/api-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { TokenExpiresAtField } from "./token-expires-at-field";
import { datetimeLocalAfterDays } from "@/lib/date-utils";
import {
  orgTokenFormSchema,
  type OrgTokenFormValues,
} from "./create-org-token-schema";

interface CreateOrgTokenSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (result: CreateApiTokenResponse) => void;
}

export function CreateOrgTokenSheet({
  open,
  onOpenChange,
  onCreated,
}: CreateOrgTokenSheetProps) {
  const create = useCreateApiToken();

  const form = useForm<OrgTokenFormValues>({
    resolver: zodResolver(orgTokenFormSchema),
    defaultValues: {
      name: "",
      description: "",
      expiresAt: datetimeLocalAfterDays(30),
    },
  });

  const handleSubmit = useCallback(
    (values: OrgTokenFormValues) => {
      const input: CreateApiTokenInput = {
        name: values.name,
        description: values.description || undefined,
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
          <SheetTitle>New CRM API Key</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Create a credential for securely sending leads into this CRM workspace.
          </p>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          <Form {...form}>
            <form
              id="org-token-form"
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
                      <Input placeholder="e.g. CI/CD Deploy Key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="What is this token used for?"
                        {...field}
                      />
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
                        maxDays={90}
                      />
                    </FormControl>
                    <FormDescription>
                      Required for safety. CRM API keys can be valid for up to 90 days.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">
                  Lead ingestion only
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  This key can create CRM leads through the ingestion API. It cannot read CRM data or access other modules.
                </p>
              </div>
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
              form="org-token-form"
              className="w-full"
              isPending={create.isPending}
              loadingText="Creating…"
            >
              Create API Key
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
