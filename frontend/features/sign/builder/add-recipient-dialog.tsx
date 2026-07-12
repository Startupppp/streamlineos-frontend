"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAddSignRecipient } from "@/hooks/api/sign/recipients";
import type { SignAuthMethod, SignRecipientType } from "@/types/sign";

const recipientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  roleName: z.string().trim().min(1, "Role is required").max(100),
  recipientType: z.enum(["signer", "approver", "cc", "viewer", "in_person_host", "internal_reviewer"]),
  routingOrder: z.number().int().min(1).max(50),
  authMethod: z.enum(["email_link", "access_code", "otp_email"]),
});
type RecipientValues = z.infer<typeof recipientSchema>;

interface AddRecipientDialogProps {
  envelopeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextRoutingOrder: number;
}

export function AddRecipientDialog({ envelopeId, open, onOpenChange, nextRoutingOrder }: AddRecipientDialogProps) {
  const addRecipient = useAddSignRecipient(envelopeId);

  async function handleSubmit(values: RecipientValues) {
    try {
      await addRecipient.mutateAsync({
        name: values.name,
        email: values.email || undefined,
        roleName: values.roleName,
        recipientType: values.recipientType as SignRecipientType,
        routingOrder: values.routingOrder,
        authMethod: values.authMethod as SignAuthMethod,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <EntityFormDialog<RecipientValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Add recipient"
      resolver={zodResolver(recipientSchema)}
      defaultValues={{
        name: "",
        email: "",
        roleName: "Signer",
        recipientType: "signer",
        routingOrder: nextRoutingOrder,
        authMethod: "email_link",
      }}
      onSubmit={handleSubmit}
      isSubmitting={addRecipient.isPending}
      submitLabel="Add recipient"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jane@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Signer, Approver, Vendor" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recipientType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="signer">Signer</SelectItem>
                    <SelectItem value="approver">Approver</SelectItem>
                    <SelectItem value="cc">CC</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="in_person_host">In-person host</SelectItem>
                    <SelectItem value="internal_reviewer">Internal reviewer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="routingOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signing order</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="authMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="email_link">Secure email link</SelectItem>
                    <SelectItem value="access_code">Access code</SelectItem>
                    <SelectItem value="otp_email">One-time code by email</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormDialog>
  );
}
