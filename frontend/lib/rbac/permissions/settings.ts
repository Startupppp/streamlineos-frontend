import type { Permission } from "./types";

export const SETTINGS_PERMISSIONS: Permission[] = [
  { name: "settings:api-tokens:read", resource: "settings:api-tokens", action: "read", description: "View personal API tokens" },
  { name: "settings:api-tokens:write", resource: "settings:api-tokens", action: "write", description: "Create and revoke personal API tokens" },
  { name: "settings:custom-fields:manage", resource: "settings:custom-fields", action: "manage", description: "Manage custom fields" },
  { name: "settings:record-layouts:manage", resource: "settings:record-layouts", action: "manage", description: "Reorder, hide and group the fields of a record type for this organisation" },
  { name: "settings:email-templates:manage", resource: "settings:email-templates", action: "manage", description: "Manage email templates" },
  { name: "settings:manage", resource: "settings", action: "manage", description: "Manage settings" },
  { name: "settings:mfa", resource: "settings", action: "mfa", description: "Manage MFA settings for the organization" },
  { name: "settings:onboarding:manage", resource: "settings:onboarding", action: "manage", description: "Manage onboarding settings" },
  { name: "settings:organization:manage", resource: "settings:organization", action: "manage", description: "Manage members, invitations, and organization structure" },
  { name: "settings:view", resource: "settings", action: "view", description: "View settings" },
  { name: "settings:webhooks:manage", resource: "settings:webhooks", action: "manage", description: "Manage webhooks" },
];
