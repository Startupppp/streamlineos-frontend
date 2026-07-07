"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import { getErrorMessage } from "@/lib/get-error-message";

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

  const supportPhone = form.watch("supportPhone");
  const handleSupportPhoneChange = useCallback((value: string) => {
    form.setValue("supportPhone", value, { shouldValidate: true });
  }, [form]);

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

  const renderField = (label: string, value: string | null | undefined, placeholder: string) => (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <p className="h-9 flex items-center text-sm px-0">{value || <span className="text-muted-foreground text-xs">{placeholder}</span>}</p>
    </div>
  );

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-semibold">General</CardTitle>
          <CardDescription>Legal identity, contact details, and organization code.</CardDescription>
        </div>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5 h-8 text-xs">
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pb-5">
        {!isEditing ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {renderField("Organization name", org.name, "—")}
            {renderField("Slug / URL handle", org.slug, "—")}
            {renderField("Legal name", org.legalName, "Not set")}
            {renderField("Organization code", org.orgCode, "Not set")}
            {renderField("Industry", org.industry, "Not set")}
            {renderField("Website", org.website, "Not set")}
            {renderField("Registration number", org.registrationNumber, "Not set")}
            {renderField("Tax / GST number", org.taxNumber, "Not set")}
            {renderField("Support email", org.supportEmail, "Not set")}
            {renderField("Support phone", org.supportPhone, "Not set")}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Organization name *</Label>
                <Input {...form.register("name")} className="h-9" />
                {form.formState.errors.name && <p className="text-[11px] text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Slug *</Label>
                <Input {...form.register("slug")} className="h-9" />
                {form.formState.errors.slug && <p className="text-[11px] text-destructive">{form.formState.errors.slug.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Legal name</Label>
                <Input {...form.register("legalName")} placeholder="Acme Inc. Pvt. Ltd." className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Organization code</Label>
                <Input {...form.register("orgCode")} placeholder="ACM-001" className="h-9 font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Industry</Label>
                <Select
                  onValueChange={(v) => form.setValue("industry", v)}
                  value={form.watch("industry") ?? ""}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Website</Label>
                <Input {...form.register("website")} placeholder="https://acme.com" className="h-9" />
                {form.formState.errors.website && <p className="text-[11px] text-destructive">{form.formState.errors.website.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Registration number</Label>
                <Input {...form.register("registrationNumber")} placeholder="CIN / Company reg. no." className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Tax / GST number</Label>
                <Input {...form.register("taxNumber")} placeholder="GSTIN / PAN / VAT" className="h-9 font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Support email</Label>
                <Input type="email" {...form.register("supportEmail")} placeholder="support@acme.com" className="h-9" />
                {form.formState.errors.supportEmail && <p className="text-[11px] text-destructive">{form.formState.errors.supportEmail.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Support phone</Label>
                <PhoneInput
                  value={supportPhone ?? ""}
                  onChange={handleSupportPhoneChange}
                  defaultCountry="IN"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isPending} size="sm" className="gap-1.5">
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isPending ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </form>
        )}
        {!canEdit && (
          <p className="text-xs text-muted-foreground mt-4">Only Owners and Admins can edit organization settings.</p>
        )}
      </CardContent>
    </Card>
  );
}
