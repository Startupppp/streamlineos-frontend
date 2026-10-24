"use client";

import { useEffect } from "react";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignSettings, useUpdateSignSettings } from "@/hooks/api/sign/settings";
import { SETTINGS_TEXT_ROW, SettingsSurface } from "./settings-surface";

const brandingSchema = z.object({
  emailSenderName: z.string().max(100).optional(),
  signingPageSupportText: z.string().max(500).optional(),
  completionMessage: z.string().max(2000).optional(),
  disclosureText: z.string().max(5000).optional(),
});

type BrandingValues = z.infer<typeof brandingSchema>;

const FIELDS: { name: keyof BrandingValues; label: string; description: string; rows?: number }[] = [
  {
    name: "emailSenderName",
    label: "Email sender name",
    description: "Name on signing emails. The organisation name is used when this is empty.",
  },
  {
    name: "signingPageSupportText",
    label: "Signing page support",
    description: "Shown on the signing page when someone needs help.",
  },
  {
    name: "completionMessage",
    label: "Completion message",
    description: "Shown after someone finishes signing.",
    rows: 3,
  },
  {
    name: "disclosureText",
    label: "Disclosure",
    description: "Extra text on the consent step, after the standard disclosure.",
    rows: 4,
  },
];

function BrandingField({
  control,
  name,
  label,
  description,
  rows,
}: {
  control: Control<BrandingValues>;
  name: keyof BrandingValues;
  label: string;
  description: string;
  rows?: number;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={SETTINGS_TEXT_ROW}>
          <div>
            <FormLabel>{label}</FormLabel>
            <FormDescription className="mt-0.5">{description}</FormDescription>
          </div>
          <FormControl>
            {rows ? (
              <Textarea rows={rows} {...field} value={field.value ?? ""} />
            ) : (
              <Input {...field} value={field.value ?? ""} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function BrandingSettingsForm() {
  const { data: settings } = useSignSettings();
  const update = useUpdateSignSettings();

  const form = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      emailSenderName: "",
      signingPageSupportText: "",
      completionMessage: "",
      disclosureText: "",
    },
  });

  useEffect(() => {
    if (settings?.brandingJson) {
      const branding = settings.brandingJson;
      form.reset({
        emailSenderName: typeof branding.emailSenderName === "string" ? branding.emailSenderName : "",
        signingPageSupportText: typeof branding.signingPageSupportText === "string" ? branding.signingPageSupportText : "",
        completionMessage: typeof branding.completionMessage === "string" ? branding.completionMessage : "",
        disclosureText: typeof branding.disclosureText === "string" ? branding.disclosureText : "",
      });
    }
  }, [settings, form]);

  async function handleSave(values: BrandingValues) {
    try {
      await update.mutateAsync({ brandingJson: values });
      toast.success("Branding saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)}>
        <SettingsSurface
          title="What signers see"
          description="Copy on emails, the signing page, and the consent step."
          footer={
            <LoadingButton type="submit" isPending={update.isPending} loadingText="Saving…">
              Save
            </LoadingButton>
          }
        >
          <div className="divide-y divide-border">
            {FIELDS.map((item) => (
              <BrandingField key={item.name} control={form.control} {...item} />
            ))}
          </div>
        </SettingsSurface>
      </form>
    </Form>
  );
}
