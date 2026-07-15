"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EntityFormSheet } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateCrmOrganization } from "@/hooks/api/crm";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(COMPANY_SIZES).optional(),
  website: z.string().optional(),
  linkedinUrl: z.string().optional(),
  description: z.string().optional(),
});

type CreateOrgForm = z.infer<typeof createOrgSchema>;

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrgDialog({ open, onOpenChange }: CreateOrgDialogProps) {
  const createOrgMutation = useCreateCrmOrganization();

  const handleSubmit = useCallback(
    (formData: CreateOrgForm) => {
      createOrgMutation.mutate(
        {
          name: formData.name,
          domain: formData.domain || undefined,
          industry: formData.industry || undefined,
          size: formData.size || undefined,
          website: formData.website || undefined,
          linkedinUrl: formData.linkedinUrl || undefined,
          description: formData.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Company created");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createOrgMutation, onOpenChange],
  );

  return (
    <EntityFormSheet<CreateOrgForm>
      open={open}
      onOpenChange={onOpenChange}
      title="Create company"
      resolver={zodResolver(createOrgSchema)}
      defaultValues={{
        name: "",
        domain: "",
        industry: "",
        website: "",
        linkedinUrl: "",
        description: "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={createOrgMutation.isPending}
      submitLabel="Create company"
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Company name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Real Estate" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company size</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full h-8">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormSheet>
  );
}
