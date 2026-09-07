"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignSettings, useUpdateSignSettings } from "@/hooks/api/sign/settings";

const brandingSchema = z.object({
  emailSenderName: z.string().max(100).optional(),
  signingPageSupportText: z.string().max(500).optional(),
  completionMessage: z.string().max(2000).optional(),
  disclosureText: z.string().max(5000).optional(),
});

type BrandingValues = z.infer<typeof brandingSchema>;

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
      const b = settings.brandingJson;
      form.reset({
        emailSenderName: typeof b.emailSenderName === "string" ? b.emailSenderName : "",
        signingPageSupportText: typeof b.signingPageSupportText === "string" ? b.signingPageSupportText : "",
        completionMessage: typeof b.completionMessage === "string" ? b.completionMessage : "",
        disclosureText: typeof b.disclosureText === "string" ? b.disclosureText : "",
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="emailSenderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email sender name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="signingPageSupportText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signing page support text</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="completionMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion message</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="disclosureText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom disclosure text</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LoadingButton type="submit" isPending={update.isPending} loadingText="Saving…">
              Save
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
