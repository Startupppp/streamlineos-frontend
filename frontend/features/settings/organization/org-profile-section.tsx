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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";

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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization name <span className="text-destructive">*</span></FormLabel>
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
                    <FormItem>
                      <FormLabel>Slug <span className="text-destructive">*</span></FormLabel>
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
                    <FormItem>
                      <FormLabel>Legal name</FormLabel>
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
                    <FormItem>
                      <FormLabel>Organization code</FormLabel>
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
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                    <FormItem>
                      <FormLabel>Website</FormLabel>
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
                    <FormItem>
                      <FormLabel>Registration number</FormLabel>
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
                    <FormItem>
                      <FormLabel>Tax / GST number</FormLabel>
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
                    <FormItem>
                      <FormLabel>Support email</FormLabel>
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
                    <FormItem>
                      <FormLabel>Support phone</FormLabel>
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
              <div className="flex gap-2 pt-2">
                <LoadingButton type="submit" isPending={isPending} size="sm" className="gap-1.5" loadingText="Saving…">
                  Save changes
                </LoadingButton>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
        {!canEdit && (
          <p className="text-xs text-muted-foreground mt-4">Only Owners and Admins can edit organization settings.</p>
        )}
      </CardContent>
    </Card>
  );
}
