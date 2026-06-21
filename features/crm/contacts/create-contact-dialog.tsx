"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { EntityFormSheet } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useCreateContact } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || isValidPhoneNumber(val), {
      message: "Invalid phone number",
    }),
  title: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
});

type CreateContactForm = z.infer<typeof createContactSchema>;

function capitalize(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateContactDialog({
  open,
  onOpenChange,
}: CreateContactDialogProps) {
  const createContactMutation = useCreateContact();

  const handleSubmit = useCallback(
    (data: CreateContactForm) => {
      createContactMutation.mutate(
        {
          name: capitalize(data.name.trim()),
          email: data.email || undefined,
          phone: data.phone || undefined,
          title: data.title || undefined,
          department: data.department || undefined,
          company: data.company || undefined,
          linkedinUrl: data.linkedinUrl || undefined,
          twitterUrl: data.twitterUrl || undefined,
          leadId: data.leadId ? Number(data.leadId) : undefined,
          dealId: data.dealId ? Number(data.dealId) : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Contact created");
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    },
    [createContactMutation, onOpenChange],
  );

  return (
    <EntityFormSheet<CreateContactForm>
      open={open}
      onOpenChange={onOpenChange}
      title="Create contact"
      resolver={zodResolver(createContactSchema)}
      defaultValues={{
        name: "",
        email: "",
        phone: "",
        title: "",
        department: "",
        company: "",
        linkedinUrl: "",
        twitterUrl: "",
        leadId: undefined,
        dealId: undefined,
      }}
      onSubmit={handleSubmit}
      isSubmitting={createContactMutation.isPending}
      submitLabel="Create contact"
    >
      {(form) => (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Full name" className="capitalize" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="email@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <PhoneInput
                    defaultCountry="IN"
                    placeholder="Enter phone number"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. VP of Sales" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="linkedinUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://linkedin.com/in/..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="leadId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked Lead ID (optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} placeholder="e.g. 42" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dealId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked Deal ID (optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} placeholder="e.g. 7" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormSheet>
  );
}
