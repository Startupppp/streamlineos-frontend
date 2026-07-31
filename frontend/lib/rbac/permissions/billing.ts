import type { Permission } from "./types";

export const BILLING_PERMISSIONS: Permission[] = [
  { name: "billing:marketplace:install", resource: "billing:marketplace", action: "install", description: "Install and uninstall marketplace apps" },
  { name: "billing:profile:update", resource: "billing:profile", action: "update", description: "Update billing profile and GST details" },
];
