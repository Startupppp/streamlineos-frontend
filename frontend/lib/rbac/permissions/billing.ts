import type { Permission } from "./types";

export const BILLING_PERMISSIONS: Permission[] = [
  { name: "billing:subscription:view", resource: "billing:subscription", action: "view", description: "View subscription plan and payment status" },
  { name: "billing:subscription:manage", resource: "billing:subscription", action: "manage", description: "Change subscription plan, complete checkout and verify payments" },
  { name: "billing:profile:view", resource: "billing:profile", action: "view", description: "View billing profile and GST details" },
  { name: "billing:seats:view", resource: "billing:seats", action: "view", description: "View seat usage and availability" },
  { name: "billing:referrals:view", resource: "billing:referrals", action: "view", description: "View referrals sent from this organisation" },
  { name: "billing:referrals:manage", resource: "billing:referrals", action: "manage", description: "Create and manage referrals" },
  { name: "billing:coupons:manage", resource: "billing:coupons", action: "manage", description: "Redeem and validate a promotion code on this organization's own subscription" },
  { name: "billing:promotions:view", resource: "billing:promotions", action: "view", description: "View platform promotion codes (vendor operators only)" },
  { name: "billing:promotions:manage", resource: "billing:promotions", action: "manage", description: "Create, update and deactivate platform promotion codes (vendor operators only)" },
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
