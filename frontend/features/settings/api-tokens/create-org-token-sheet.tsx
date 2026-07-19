"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  useCreateApiToken,
  type CreateApiTokenInput,
  type CreateApiTokenResponse,
} from "@/hooks/api/api-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { ScopeSelector } from "./scope-selector";

const orgTokenFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
  expiresAt: z.string().optional(),
});

type OrgTokenFormValues = z.infer<typeof orgTokenFormSchema>;

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
    defaultValues: { name: "", description: "", scopes: [], expiresAt: "" },
  });

  const handleSubmit = useCallback(
    (values: OrgTokenFormValues) => {
      const input: CreateApiTokenInput = {
        name: values.name,
        description: values.description || undefined,
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
          <SheetTitle>New Organization Token</SheetTitle>
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
                    <FormLabel>Scopes</FormLabel>
                    <ScopeSelector
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
            form="org-token-form"
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
