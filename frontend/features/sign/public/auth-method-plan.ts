import type { SignAuthMethod } from "@/types/sign";

export type AuthScreenPlan =
  | { kind: "access_code" }
  | { kind: "otp"; channel: "email" | "sms"; prompt: string; sentMessage: string }
  | { kind: "unavailable"; method: SignAuthMethod; label: string };

export const IMPLEMENTED_AUTH_METHODS = new Set<SignAuthMethod>([
  "email_link",
  "access_code",
  "otp_email",
  "otp_sms",
]);

const UNIMPLEMENTED_LABELS: Record<string, string> = {
  sso: "single sign-on",
  passkey: "a passkey",
  kba: "knowledge-based questions",
  id_verification: "identity document verification",
};

// sso/passkey/kba/id_verification are in the enum and implemented nowhere; rows still carry them,
// so the signing screen must name them rather than fall through to a code form the backend refuses.
export function authScreenPlan(method: SignAuthMethod): AuthScreenPlan {
  if (method === "access_code") return { kind: "access_code" };

  if (method === "otp_sms")
    return {
      kind: "otp",
      channel: "sms",
      prompt: "We'll text a one-time code to the phone number on file.",
      sentMessage: "Code sent — check your phone",
    };

  if (method === "otp_email" || method === "email_link")
    return {
      kind: "otp",
      channel: "email",
      prompt: "We'll send a one-time code to your email.",
      sentMessage: "Code sent — check your email",
    };

  return { kind: "unavailable", method, label: UNIMPLEMENTED_LABELS[method] ?? method };
}
