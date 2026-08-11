"use client";

import { useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared";
import { createContactSchema, type CreateContactForm } from "./create-contact-dialog-schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Combobox } from "@/components/ui/combobox";
import { useCreateContact, useDeals } from "@/hooks/api/crm";
import { useLeads } from "@/hooks/api/leads";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

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
  const { data: leadsData } = useLeads(undefined, { enabled: open });
  const { data: dealsData } = useDeals(undefined);

  const leadOptions = useMemo(
    () =>
      (leadsData?.leads ?? []).map((l) => ({
        value: String(l.id),
        label: l.name,
        sublabel: l.email ?? undefined,
      })),
    [leadsData],
  );

  const dealOptions = useMemo(
    () =>
      (dealsData ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dealsData],
  );

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
          onError: (err) => toast.error(getErrorMessage(err)),
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
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Full name"
                      className="capitalize"
                    />
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
                  <Input
                    {...field}
                    type="email"
                    placeholder="email@example.com"
                  />
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
                <FormLabel>Linked Lead (optional)</FormLabel>
                <FormControl>
                  <Combobox
                    options={leadOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Search leads…"
                    searchPlaceholder="Search by name or email"
                    emptyText="No leads found"
                  />
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
                <FormLabel>Linked Deal (optional)</FormLabel>
                <FormControl>
                  <Combobox
                    options={dealOptions}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Search deals…"
                    searchPlaceholder="Search by name"
                    emptyText="No deals found"
                  />
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
