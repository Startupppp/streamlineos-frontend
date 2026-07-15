"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useSavePaymentCredentials,
  useDisconnectPaymentCredentials,
  type PaymentEnvironment,
  type PaymentProviderCredentialPublic,
} from "@/hooks/api/payments";

type CredentialsTabProps = {
  providerKey: string;
  environment: PaymentEnvironment;
  credential: PaymentProviderCredentialPublic | undefined;
};

export function CredentialsTab({ providerKey, environment, credential }: CredentialsTabProps) {
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const save = useSavePaymentCredentials(providerKey);
  const disconnect = useDisconnectPaymentCredentials(providerKey);

  function handleSave() {
    if (!keyId.trim() && !secret.trim() && !webhookSecret.trim()) {
      toast.error("Enter at least one field to save");
      return;
    }
    save.mutate(
      {
        environment,
        ...(keyId.trim() ? { keyId: keyId.trim() } : {}),
        ...(secret.trim() ? { secret: secret.trim() } : {}),
        ...(webhookSecret.trim() ? { webhookSecret: webhookSecret.trim() } : {}),
      },
      {
        onSuccess: (res) => {
          toast.success(`${environment === "live" ? "Live" : "Test"} credentials saved`);
          if (res.warning) toast.warning(res.warning.message);
          setKeyId("");
          setSecret("");
          setWebhookSecret("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleDisconnect() {
    disconnect.mutate(environment, {
      onSuccess: () => toast.success(`${environment === "live" ? "Live" : "Test"} credentials disconnected`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {environment === "live" ? "Live credentials" : "Test credentials"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {credential?.maskedKeyHint
              ? `Saved — key ending in ${credential.maskedKeyHint}`
              : "Not configured yet"}
          </p>
        </div>
        {credential?.hasSecret && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-muted-foreground">
                <Unlink className="h-3 w-3" /> Disconnect
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect {environment} credentials?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the stored key and secret. You&apos;ll need to re-enter them to accept payments again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect}>Disconnect</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${environment}-key-id`} className="text-[13px]">Key ID</Label>
        <Input
          id={`${environment}-key-id`}
          value={keyId}
          onChange={(e) => setKeyId(e.target.value)}
          placeholder={credential?.maskedKeyHint ? `Currently ****${credential.maskedKeyHint.slice(-4)}` : "rzp_test_..."}
          className="h-8 text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${environment}-secret`} className="text-[13px]">Key secret</Label>
        <Input
          id={`${environment}-secret`}
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={credential?.hasSecret ? "Saved — enter a new value to replace" : "Enter key secret"}
          className="h-8 text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${environment}-webhook-secret`} className="text-[13px]">Webhook secret</Label>
        <Input
          id={`${environment}-webhook-secret`}
          type="password"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          placeholder={credential?.hasWebhookSecret ? "Saved — enter a new value to replace" : "Enter webhook secret"}
          className="h-8 text-sm font-mono"
        />
      </div>

      <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={save.isPending}>
        <KeyRound className="h-3.5 w-3.5" />
        Save {environment} credentials
      </Button>
    </div>
  );
}
