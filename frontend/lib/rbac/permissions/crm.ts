import type { Permission } from "./types";

export const CRM_PERMISSIONS: Permission[] = [
  {
    name: "crm:leads:view",
    resource: "crm:leads",
    action: "view",
    description: "View CRM leads",
  },
  {
    name: "crm:leads:create",
    resource: "crm:leads",
    action: "create",
    description: "Create CRM leads",
  },
  {
    name: "crm:leads:update",
    resource: "crm:leads",
    action: "update",
    description: "Update CRM leads",
  },
  {
    name: "crm:leads:assign",
    resource: "crm:leads",
    action: "assign",
    description: "Assign CRM leads",
  },
  {
    name: "crm:leads:delete",
    resource: "crm:leads",
    action: "delete",
    description: "Delete CRM leads",
  },
  {
    name: "crm:targets:view",
    resource: "crm:targets",
    action: "view",
    description: "View targets",
  },
  {
    name: "crm:targets:manage",
    resource: "crm:targets",
    action: "manage",
    description: "Manage targets",
  },
  {
    name: "crm:reports:view",
    resource: "crm:reports",
    action: "view",
    description: "View CRM reports",
  },
  {
    name: "crm:reports:export",
    resource: "crm:reports",
    action: "export",
    description: "Export CRM reports",
  },
  { name: "crm:clients:read", resource: "crm:clients", action: "read", description: "View client accounts" },
  { name: "crm:clients:update", resource: "crm:clients", action: "update", description: "Update client accounts" },
  { name: "crm:incentives:read", resource: "crm:incentives", action: "read", description: "View incentives" },
  { name: "crm:incentives:approve", resource: "crm:incentives", action: "approve", description: "Approve incentives" },
  { name: "crm:incentives:config", resource: "crm:incentives", action: "config", description: "Configure incentive rates" },
  { name: "crm:contacts:view", resource: "crm:contacts", action: "view", description: "View CRM contacts" },
  { name: "crm:contacts:manage", resource: "crm:contacts", action: "manage", description: "Create and manage CRM contacts" },
  { name: "crm:contacts:merge", resource: "crm:contacts", action: "merge", description: "Merge duplicate CRM contacts" },
  { name: "crm:organizations:view", resource: "crm:organizations", action: "view", description: "View CRM companies" },
  { name: "crm:organizations:manage", resource: "crm:organizations", action: "manage", description: "Create and manage CRM companies" },
  { name: "crm:organizations:merge", resource: "crm:organizations", action: "merge", description: "Merge duplicate CRM companies" },
];
