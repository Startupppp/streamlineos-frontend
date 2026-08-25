"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { KeyRoundIcon, UnlinkIcon } from "@animateicons/react/lucide";
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

  function handleKeyIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKeyId(e.target.value);
  }

  function handleSecretChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSecret(e.target.value);
  }

  function handleWebhookSecretChange(e: React.ChangeEvent<HTMLInputElement>) {
    setWebhookSecret(e.target.value);
  }

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
          <p className="text-dense text-muted-foreground mt-0.5">
            {credential?.maskedKeyHint
              ? `Saved — key ending in ${credential.maskedKeyHint}`
              : "Not configured yet"}
          </p>
        </div>
        {credential?.hasSecret && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <AnimatedIconButton icon={UnlinkIcon} iconSize={12} iconClassName="mr-1.5" size="sm" variant="outline" className="text-xs text-muted-foreground">Disconnect</AnimatedIconButton>
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
        <Label htmlFor={`${environment}-key-id`} className="text-label">Key ID</Label>
        <Input
          id={`${environment}-key-id`}
          value={keyId}
          onChange={handleKeyIdChange}
          placeholder={credential?.maskedKeyHint ? `Currently ****${credential.maskedKeyHint.slice(-4)}` : "rzp_test_..."}
          className="text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${environment}-secret`} className="text-label">Key secret</Label>
        <Input
          id={`${environment}-secret`}
          type="password"
          value={secret}
          onChange={handleSecretChange}
          placeholder={credential?.hasSecret ? "Saved — enter a new value to replace" : "Enter key secret"}
          className="text-sm font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${environment}-webhook-secret`} className="text-label">Webhook secret</Label>
        <Input
          id={`${environment}-webhook-secret`}
          type="password"
          value={webhookSecret}
          onChange={handleWebhookSecretChange}
          placeholder={credential?.hasWebhookSecret ? "Saved — enter a new value to replace" : "Enter webhook secret"}
          className="text-sm font-mono"
        />
      </div>

      <AnimatedIconButton icon={KeyRoundIcon} iconSize={14} iconClassName="mr-1.5" size="sm" className="text-xs" onClick={handleSave} disabled={save.isPending}>
        Save {environment} credentials
      </AnimatedIconButton>
    </div>
  );
}
