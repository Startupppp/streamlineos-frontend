import { HR_PERMISSIONS } from "./hr";
import { CRM_PERMISSIONS } from "./crm";
import { SHARED_PERMISSIONS } from "./shared";
import { SUPPORT_PERMISSIONS } from "./support";

export const PERMISSIONS = [
  ...HR_PERMISSIONS,
  ...CRM_PERMISSIONS,
  ...SHARED_PERMISSIONS,
  ...SUPPORT_PERMISSIONS,
];

const EMPLOYEE_SELF_SERVICE = [
  "self:attendance",
  "self:leaves",
  "self:expenses",
  "self:payslips",
  "hr:leaves:create",
  "hr:expenses:create",
];

export const SYSTEM_ROLES = [
  "OWNER",
  "CEO",
  "HR",
  "SALES",
  "CUSTOMER_SUPPORT",
  "ENGINEERING",
  "DESIGN",
  "VIDEO_EDITOR",
  "DIGITAL_MARKETING",
  "BLOG_EDITOR",
  "BRANCH_MANAGER",
  "BRANCH_HR",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

const ALL_PERMISSIONS = PERMISSIONS.map((p) => p.name);

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  OWNER: ALL_PERMISSIONS,

  CEO: ALL_PERMISSIONS,

  HR: [
    ...EMPLOYEE_SELF_SERVICE,
    "hr:employees:view",
    "hr:employees:create",
    "hr:employees:update",
    "hr:employees:delete",
    "hr:attendance:view",
    "hr:attendance:manage",
    "hr:leaves:view",
    "hr:leaves:approve",
    "hr:payroll:view",
    "hr:payroll:generate",
    "hr:payroll:approve",
    "hr:salary:view",
    "hr:salary:manage",
    "hr:expenses:view",
    "hr:expenses:approve",
    "hr:documents:view",
    "hr:documents:manage",
    "hr:assets:view",
    "hr:assets:manage",
    "hr:performance:view",
    "hr:performance:manage",
    "hr:goals:view",
    "hr:goals:manage",
    "accounting:view",
    "accounting:report",
    "reports:view",
    "reports:create",
    "reports:export",
  ],

  SALES: [
    ...EMPLOYEE_SELF_SERVICE,
    "crm:leads:view",
    "crm:leads:update",
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  CUSTOMER_SUPPORT: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:support:view",
    "support:kb:view",
    "support:kb:manage",
    "projects:roadmap:view",
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  ENGINEERING: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:sprints:view",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "projects:goals:view",
    "projects:roadmap:view",
  ],

  DESIGN: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  VIDEO_EDITOR: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  DIGITAL_MARKETING: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  BLOG_EDITOR: [...EMPLOYEE_SELF_SERVICE],

  BRANCH_MANAGER: [
    ...EMPLOYEE_SELF_SERVICE,
    "hr:employees:view",
    "hr:employees:create",
    "hr:employees:update",
    "hr:attendance:view",
    "hr:attendance:manage",
    "hr:leaves:view",
    "hr:leaves:approve",
    "hr:payroll:view",
    "hr:expenses:view",
    "hr:expenses:approve",
    "hr:documents:view",
    "hr:documents:manage",
    "hr:performance:view",
    "hr:performance:manage",
    "hr:goals:view",
    "hr:goals:manage",
    "crm:leads:view",
    "crm:leads:create",
    "crm:leads:update",
    "crm:leads:assign",
    "crm:targets:view",
    "crm:reports:view",
    "projects:view",
    "projects:tickets:view",
    "reports:view",
    "settings:view",
    "dashboard:sales:view",
  ],

  BRANCH_HR: [
    ...EMPLOYEE_SELF_SERVICE,
    "hr:employees:view",
    "hr:employees:create",
    "hr:employees:update",
    "hr:attendance:view",
    "hr:attendance:manage",
    "hr:leaves:view",
    "hr:leaves:approve",
    "hr:payroll:view",
    "hr:payroll:generate",
    "hr:expenses:view",
    "hr:expenses:approve",
    "hr:documents:view",
    "hr:documents:manage",
    "hr:assets:view",
    "hr:assets:manage",
    "hr:performance:view",
    "hr:performance:manage",
    "hr:goals:view",
    "hr:goals:manage",
    "projects:view",
    "projects:tickets:view",
    "reports:view",
  ],
};

export function getPermissionName(resource: string, action: string): string {
  return `${resource}:${action}`;
}

export function parsePermission(permission: string): { resource: string; action: string } {
  const [resource, action] = permission.split(":");
  return { resource: resource ?? "", action: action ?? "" };
}
