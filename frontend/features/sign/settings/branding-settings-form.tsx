"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignSettings, useUpdateSignSettings } from "@/hooks/api/sign/settings";

export function BrandingSettingsForm() {
  const { data: settings } = useSignSettings();
  const update = useUpdateSignSettings();
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings?.brandingJson) {
      setForm({
        emailSenderName: settings.brandingJson.emailSenderName ?? "",
        signingPageSupportText: settings.brandingJson.signingPageSupportText ?? "",
        completionMessage: settings.brandingJson.completionMessage ?? "",
        disclosureText: settings.brandingJson.disclosureText ?? "",
      });
    }
  }, [settings]);

  async function handleSave() {
    try {
      await update.mutateAsync({ brandingJson: form });
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
        <div className="space-y-1.5">
          <Label>Email sender name</Label>
          <Input value={form.emailSenderName ?? ""} onChange={(e) => setForm((f) => ({ ...f, emailSenderName: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Signing page support text</Label>
          <Input
            value={form.signingPageSupportText ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, signingPageSupportText: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Completion message</Label>
          <Textarea rows={2} value={form.completionMessage ?? ""} onChange={(e) => setForm((f) => ({ ...f, completionMessage: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Custom disclosure text</Label>
          <Textarea rows={3} value={form.disclosureText ?? ""} onChange={(e) => setForm((f) => ({ ...f, disclosureText: e.target.value }))} />
        </div>
        <LoadingButton onClick={handleSave} isPending={update.isPending} loadingText="Saving…">
          Save
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
