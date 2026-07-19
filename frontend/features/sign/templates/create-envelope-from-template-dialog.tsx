"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateEnvelopeFromTemplate } from "@/hooks/api/sign/templates";
import type { SignTemplate } from "@/types/sign";

interface TemplateRole {
  roleName: string;
  recipientType: string;
}

export function CreateEnvelopeFromTemplateDialog({
  template,
  open,
  onOpenChange,
}: {
  template: SignTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createEnvelope = useCreateEnvelopeFromTemplate(template.id);
  const roles = useMemo<TemplateRole[]>(() => {
    const raw = (template.templateJson as { roles?: TemplateRole[] })?.roles ?? [];
    return raw;
  }, [template.templateJson]);

  const schema = useMemo(() =>
    z.record(z.string(), z.string()).superRefine((data, ctx) => {
      for (const role of roles) {
        const nameKey = `${role.roleName}__name`;
        const emailKey = `${role.roleName}__email`;
        if (!data[nameKey] || data[nameKey].trim().length === 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Name is required", path: [nameKey] });
        }
        const emailVal = data[emailKey] ?? "";
        if (emailVal.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email", path: [emailKey] });
        }
      }
    }),
    [roles],
  );

  type FormValues = Record<string, string>;

  const defaultValues = useMemo(
    () =>
      Object.fromEntries(
        roles.flatMap((role) => [
          [`${role.roleName}__name`, ""],
          [`${role.roleName}__email`, ""],
        ]),
      ),
    [roles],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  async function handleSubmit(values: FormValues) {
    const recipients = roles.map((role) => ({
      roleName: role.roleName,
      name: (values[`${role.roleName}__name`] ?? "").trim(),
      email: (values[`${role.roleName}__email`] ?? "").trim() || undefined,
    }));
    try {
      const envelope = await createEnvelope.mutateAsync({ recipients });
      onOpenChange(false);
      router.push(`/sign/envelopes/${envelope.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New envelope from &quot;{template.name}&quot;</DialogTitle>
        </DialogHeader>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">This template has no recipient roles configured.</p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {roles.map((role) => (
                <div key={role.roleName} className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{role.roleName}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`${role.roleName}__name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`${role.roleName}__email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isPending={createEnvelope.isPending}
                  loadingText="Creating…"
                  disabled={roles.length === 0}
                >
                  Create envelope
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        )}
        {roles.length === 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
