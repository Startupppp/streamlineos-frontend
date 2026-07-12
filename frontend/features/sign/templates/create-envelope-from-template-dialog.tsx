"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateEnvelopeFromTemplate } from "@/hooks/api/sign/templates";
import type { SignTemplate } from "@/types/sign";

interface TemplateRole {
  roleName: string;
  recipientType: string;
}

export function CreateEnvelopeFromTemplateDialog({
  template,
  open,
  onOpenChange,
}: {
  template: SignTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createEnvelope = useCreateEnvelopeFromTemplate(template.id);
  const roles = useMemo(() => {
    const raw = (template.templateJson as { roles?: TemplateRole[] })?.roles ?? [];
    return raw;
  }, [template.templateJson]);

  const [values, setValues] = useState<Record<string, { name: string; email: string }>>({});

  function update(roleName: string, field: "name" | "email", value: string) {
    setValues((prev) => ({ ...prev, [roleName]: { ...prev[roleName], [field]: value } }));
  }

  async function handleSubmit() {
    const recipients = roles.map((role) => ({
      roleName: role.roleName,
      name: values[role.roleName]?.name?.trim() ?? "",
      email: values[role.roleName]?.email?.trim() || undefined,
    }));
    if (recipients.some((r) => !r.name)) {
      toast.error("Please fill in a name for every role");
      return;
    }
    try {
      const envelope = await createEnvelope.mutateAsync({ recipients });
      onOpenChange(false);
      router.push(`/sign/envelopes/${envelope.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New envelope from &quot;{template.name}&quot;</DialogTitle>
        </DialogHeader>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">This template has no recipient roles configured.</p>
        ) : (
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.roleName} className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{role.roleName}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`${role.roleName}-name`}>Name</Label>
                    <Input id={`${role.roleName}-name`} onChange={(e) => update(role.roleName, "name", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${role.roleName}-email`}>Email</Label>
                    <Input id={`${role.roleName}-email`} type="email" onChange={(e) => update(role.roleName, "email", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton onClick={handleSubmit} isPending={createEnvelope.isPending} loadingText="Creating…" disabled={roles.length === 0}>
            Create envelope
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
