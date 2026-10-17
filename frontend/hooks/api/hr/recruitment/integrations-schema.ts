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

/**
 * One third party Recruitment OS would talk to.
 *
 * `blockedCode` is the whole point of this shape: `null` means usable right
 * now, and every other value is a different problem with a different answer.
 * `not-implemented` in particular is ours, not the organisation's — `blockedBy`
 * names the dependency so nobody is sent looking for a key that would not help.
 */
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
  /** Last four characters only — enough to tell two keys apart, never to use one. */
  credentialHint: z.string().nullable(),
  blockedCode: z.enum(["no-integration", "inactive", "needs-keys", "not-implemented"]).nullable(),
});

export const integrationsListContract = z.array(integrationStatusContract);

export const disconnectIntegrationContract = z.object({ platform: z.string() });

export const rotateInboundSecretContract = z.object({
  platform: z.string(),
  /** Returned exactly once. The list never shows it again. */
  inboundSecret: z.string(),
  callbackPath: z.string(),
});
