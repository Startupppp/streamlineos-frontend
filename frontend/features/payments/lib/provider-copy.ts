import type { PaymentEnvironment } from "@/hooks/api/payments";

interface ProviderCredentialCopy {
  keyIdLabel: string;
  keyIdPrefix: Record<PaymentEnvironment, string>;
  secretLabel: string;
  webhookSecretLabel: string;
}

/** Each provider names the same three stored fields differently; the backend stores them neutrally. */
const CREDENTIAL_COPY: Record<string, ProviderCredentialCopy> = {
  razorpay: {
    keyIdLabel: "Key ID",
    keyIdPrefix: { test: "rzp_test_...", live: "rzp_live_..." },
    secretLabel: "Key secret",
    webhookSecretLabel: "Webhook secret",
  },
  stripe: {
    keyIdLabel: "Publishable key",
    keyIdPrefix: { test: "pk_test_...", live: "pk_live_..." },
    secretLabel: "Secret key",
    webhookSecretLabel: "Webhook signing secret",
  },
};

export function credentialCopyFor(providerKey: string): ProviderCredentialCopy {
  return CREDENTIAL_COPY[providerKey] ?? CREDENTIAL_COPY.razorpay;
}
