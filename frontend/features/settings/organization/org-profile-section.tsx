"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  OrgSettingsCard,
  OrgSettingsEditButton,
  OrgSettingsFormActions,
  SettingsField,
  SettingsFieldGrid,
} from "./org-settings-chrome";

const INDUSTRIES = [
  "Technology", "Finance & Banking", "Healthcare", "Retail & E-commerce",
  "Manufacturing", "Education", "Real Estate", "Logistics & Supply Chain",
  "Marketing & Advertising", "Consulting", "Legal", "Media & Entertainment",
  "Hospitality & Travel", "Non-profit", "Other",
] as const;

const orgGeneralSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  legalName: z.string().max(200).optional(),
  orgCode: z.string().max(20).optional(),
  industry: z.string().optional(),
  website: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  registrationNumber: z.string().max(100).optional(),
  taxNumber: z.string().max(100).optional(),
  supportEmail: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  supportPhone: z.string().max(30).optional(),
});

type OrgGeneralValues = z.infer<typeof orgGeneralSchema>;

interface OrgProfileSectionProps {
  org: OrgSettings;
  canEdit: boolean;
}

export function OrgProfileSection({ org, canEdit }: OrgProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { mutate: updateOrg, isPending } = useUpdateOrgSettings();

  const form = useForm<OrgGeneralValues>({
    resolver: zodResolver(orgGeneralSchema),
    defaultValues: {
      name: org.name ?? "",
      slug: org.slug ?? "",
      legalName: org.legalName ?? "",
      orgCode: org.orgCode ?? "",
      industry: org.industry ?? "",
      website: org.website ?? "",
      registrationNumber: org.registrationNumber ?? "",
      taxNumber: org.taxNumber ?? "",
      supportEmail: org.supportEmail ?? "",
      supportPhone: org.supportPhone ?? "",
    },
  });

  const handleEdit = useCallback(() => {
    form.reset({
      name: org.name ?? "",
      slug: org.slug ?? "",
      legalName: org.legalName ?? "",
      orgCode: org.orgCode ?? "",
      industry: org.industry ?? "",
      website: org.website ?? "",
      registrationNumber: org.registrationNumber ?? "",
      taxNumber: org.taxNumber ?? "",
      supportEmail: org.supportEmail ?? "",
      supportPhone: org.supportPhone ?? "",
    });
    setIsEditing(true);
  }, [org, form]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    form.reset();
  }, [form]);

  const handleSave = useCallback((values: OrgGeneralValues) => {
    updateOrg(
      {
        name: values.name,
        slug: values.slug || undefined,
        legalName: values.legalName || null,
        orgCode: values.orgCode || null,
        industry: values.industry || null,
        website: values.website || null,
        registrationNumber: values.registrationNumber || null,
        taxNumber: values.taxNumber || null,
        supportEmail: values.supportEmail || null,
        supportPhone: values.supportPhone || null,
      },
      {
        onSuccess: () => {
          toast.success("Organization settings saved");
          setIsEditing(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [updateOrg]);

  return (
    <OrgSettingsCard
      title="General"
      description="Legal identity, contact details, and organization code."
      icon={<Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      action={canEdit && !isEditing ? <OrgSettingsEditButton onClick={handleEdit} /> : undefined}
    >
      {!isEditing ? (
        <SettingsFieldGrid>
          <SettingsField label="Organization name" value={org.name} empty="—" />
          <SettingsField label="Slug / URL handle" value={org.slug} empty="—" />
          <SettingsField label="Legal name" value={org.legalName} />
          <SettingsField label="Organization code" value={org.orgCode} />
          <SettingsField label="Industry" value={org.industry} />
          <SettingsField label="Website" value={org.website} />
          <SettingsField label="Registration number" value={org.registrationNumber} />
          <SettingsField label="Tax / GST number" value={org.taxNumber} />
          <SettingsField label="Support email" value={org.supportEmail} />
          <SettingsField label="Support phone" value={org.supportPhone} />
        </SettingsFieldGrid>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Organization name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Slug <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Legal name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Acme Inc. Pvt. Ltd." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orgCode"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Organization code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ACM-001" className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                        {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
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
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://acme.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Registration number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="CIN / Company reg. no." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxNumber"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Tax / GST number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="GSTIN / PAN / VAT" className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supportEmail"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Support email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="support@acme.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supportPhone"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Support phone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        defaultCountry="IN"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <OrgSettingsFormActions onCancel={handleCancel} isPending={isPending}>
              <LoadingButton type="submit" isPending={isPending} size="sm" className="gap-1.5" loadingText="Saving…">
                Save changes
              </LoadingButton>
            </OrgSettingsFormActions>
          </form>
        </Form>
      )}
      {!canEdit && (
        <p className="text-xs text-muted-foreground mt-3">Only Owners and Admins can edit organization settings.</p>
      )}
    </OrgSettingsCard>
  );
}
