import type { Permission } from "./types";

export const BILLING_PERMISSIONS: Permission[] = [
  { name: "billing:marketplace:view", resource: "billing:marketplace", action: "view", description: "View marketplace apps" },
  { name: "billing:marketplace:install", resource: "billing:marketplace", action: "install", description: "Install and uninstall marketplace apps" },
  { name: "billing:ai-credits:view", resource: "billing:ai-credits", action: "view", description: "View AI credits wallet and history" },
  { name: "billing:ai-credits:purchase", resource: "billing:ai-credits", action: "purchase", description: "Purchase AI credit packs" },
  { name: "billing:analytics:view", resource: "billing:analytics", action: "view", description: "View revenue analytics (platform admin only)" },
  { name: "billing:affiliate:manage", resource: "billing:affiliate", action: "manage", description: "Manage affiliate program" },
  { name: "billing:profile:update", resource: "billing:profile", action: "update", description: "Update billing profile and GST details" },
  { name: "billing:enterprise-quotes:view", resource: "billing:enterprise-quotes", action: "view", description: "View enterprise quotes" },
  { name: "billing:enterprise-quotes:create", resource: "billing:enterprise-quotes", action: "create", description: "Create enterprise quotes" },
  { name: "billing:enterprise-quotes:approve", resource: "billing:enterprise-quotes", action: "approve", description: "Approve/reject/send enterprise quotes" },
];
