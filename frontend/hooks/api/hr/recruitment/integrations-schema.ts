import { z } from "zod";

export const INTEGRATION_FAMILIES = [
  "job-board",
  "ats-sync",
  "calendar",
  "transcription",
  "voice-screen",
  "assessment",
  "background-check",
  "identity",
  "messaging",
  "chat-notify",
] as const;

export const integrationStatusContract = z.object({
  platform: z.string(),
  family: z.enum(INTEGRATION_FAMILIES),
  label: z.string(),
  does: z.string(),
  manualFallback: z.string().nullable(),
  adapterImplemented: z.boolean(),
  blockedBy: z.string().nullable(),
  connected: z.boolean(),
  isActive: z.boolean(),
  hasCredentials: z.boolean(),
  credentialHint: z.string().nullable(),
  blockedCode: z.enum(["no-integration", "inactive", "needs-keys", "not-implemented"]).nullable(),
});

export const integrationsListContract = z.array(integrationStatusContract);

export const disconnectIntegrationContract = z.object({ platform: z.string() });

export const rotateInboundSecretContract = z.object({
  platform: z.string(),
  inboundSecret: z.string(),
  callbackPath: z.string(),
});
