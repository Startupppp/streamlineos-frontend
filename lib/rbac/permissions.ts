export type Permission = {
  name: string;
  resource: string;
  action: string;
  description: string;
};

export const PERMISSIONS: Permission[] = [
  {
    name: "hr:employees:view",
    resource: "hr:employees",
    action: "view",
    description: "View employees list",
  },
  {
    name: "hr:employees:create",
    resource: "hr:employees",
    action: "create",
    description: "Create new employees",
  },
  {
    name: "hr:employees:update",
    resource: "hr:employees",
    action: "update",
    description: "Update employee information",
  },
  {
    name: "hr:employees:delete",
    resource: "hr:employees",
    action: "delete",
    description: "Delete employees",
  },
  {
    name: "hr:attendance:view",
    resource: "hr:attendance",
    action: "view",
    description: "View attendance records",
  },
  {
    name: "hr:attendance:manage",
    resource: "hr:attendance",
    action: "manage",
    description: "Manage attendance records",
  },
  {
    name: "hr:leaves:view",
    resource: "hr:leaves",
    action: "view",
    description: "View leave requests",
  },
  {
    name: "hr:leaves:create",
    resource: "hr:leaves",
    action: "create",
    description: "Create leave requests",
  },
  {
    name: "hr:leaves:approve",
    resource: "hr:leaves",
    action: "approve",
    description: "Approve/reject leave requests",
  },
  {
    name: "hr:payroll:view",
    resource: "hr:payroll",
    action: "view",
    description: "View payroll information",
  },
  {
    name: "hr:payroll:generate",
    resource: "hr:payroll",
    action: "generate",
    description: "Generate payroll",
  },
  {
    name: "hr:payroll:approve",
    resource: "hr:payroll",
    action: "approve",
    description: "Approve payroll",
  },
  {
    name: "hr:salary:view",
    resource: "hr:salary",
    action: "view",
    description: "View salary structures",
  },
  {
    name: "hr:salary:manage",
    resource: "hr:salary",
    action: "manage",
    description: "Manage salary structures",
  },
  {
    name: "hr:expenses:view",
    resource: "hr:expenses",
    action: "view",
    description: "View expenses",
  },
  {
    name: "hr:expenses:create",
    resource: "hr:expenses",
    action: "create",
    description: "Create expense requests",
  },
  {
    name: "hr:expenses:approve",
    resource: "hr:expenses",
    action: "approve",
    description: "Approve expense requests",
  },
  {
    name: "hr:assets:view",
    resource: "hr:assets",
    action: "view",
    description: "View assets",
  },
  {
    name: "hr:assets:manage",
    resource: "hr:assets",
    action: "manage",
    description: "Manage assets",
  },
  {
    name: "hr:documents:view",
    resource: "hr:documents",
    action: "view",
    description: "View documents",
  },
  {
    name: "hr:documents:manage",
    resource: "hr:documents",
    action: "manage",
    description: "Manage documents",
  },
  {
    name: "hr:performance:view",
    resource: "hr:performance",
    action: "view",
    description: "View performance reviews",
  },
  {
    name: "hr:performance:manage",
    resource: "hr:performance",
    action: "manage",
    description: "Manage performance reviews",
  },
  {
    name: "hr:goals:view",
    resource: "hr:goals",
    action: "view",
    description: "View goals",
  },
  {
    name: "hr:goals:manage",
    resource: "hr:goals",
    action: "manage",
    description: "Manage goals",
  },
  {
    name: "projects:view",
    resource: "projects",
    action: "view",
    description: "View projects",
  },
  {
    name: "projects:create",
    resource: "projects",
    action: "create",
    description: "Create projects",
  },
  {
    name: "projects:update",
    resource: "projects",
    action: "update",
    description: "Update projects",
  },
  {
    name: "projects:delete",
    resource: "projects",
    action: "delete",
    description: "Delete projects",
  },
  {
    name: "projects:tickets:view",
    resource: "projects:tickets",
    action: "view",
    description: "View tickets",
  },
  {
    name: "projects:tickets:create",
    resource: "projects:tickets",
    action: "create",
    description: "Create tickets",
  },
  {
    name: "projects:tickets:update",
    resource: "projects:tickets",
    action: "update",
    description: "Update tickets",
  },
  {
    name: "projects:tickets:delete",
    resource: "projects:tickets",
    action: "delete",
    description: "Delete tickets",
  },
  {
    name: "projects:tickets:assign",
    resource: "projects:tickets",
    action: "assign",
    description: "Assign tickets",
  },
  {
    name: "projects:sprints:view",
    resource: "projects:sprints",
    action: "view",
    description: "View sprints",
  },
  {
    name: "projects:sprints:manage",
    resource: "projects:sprints",
    action: "manage",
    description: "Manage sprints",
  },
  {
    name: "projects:timesheets:view",
    resource: "projects:timesheets",
    action: "view",
    description: "View timesheets",
  },
  {
    name: "projects:timesheets:create",
    resource: "projects:timesheets",
    action: "create",
    description: "Create timesheet entries",
  },
  {
    name: "reports:view",
    resource: "reports",
    action: "view",
    description: "View reports",
  },
  {
    name: "reports:create",
    resource: "reports",
    action: "create",
    description: "Create reports",
  },
  {
    name: "reports:export",
    resource: "reports",
    action: "export",
    description: "Export reports",
  },
  {
    name: "settings:view",
    resource: "settings",
    action: "view",
    description: "View settings",
  },
  {
    name: "settings:manage",
    resource: "settings",
    action: "manage",
    description: "Manage settings",
  },
  {
    name: "settings:rbac:manage",
    resource: "settings:rbac",
    action: "manage",
    description: "Manage RBAC permissions",
  },
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
  // Dashboard-specific permissions
  {
    name: "dashboard:sales:view",
    resource: "dashboard:sales",
    action: "view",
    description: "View Sales dashboard",
  },
  {
    name: "dashboard:customer-executive:view",
    resource: "dashboard:customer-executive",
    action: "view",
    description: "View Customer Executive dashboard",
  },
  {
    name: "dashboard:support:view",
    resource: "dashboard:support",
    action: "view",
    description: "View Support CRM dashboard",
  },
  // Self-service permissions (every employee has these)
  {
    name: "self:attendance",
    resource: "self",
    action: "attendance",
    description: "Check in/out own attendance",
  },
  {
    name: "self:leaves",
    resource: "self",
    action: "leaves",
    description: "Submit and view own leave requests",
  },
  {
    name: "self:expenses",
    resource: "self",
    action: "expenses",
    description: "Submit and view own expense claims",
  },
  {
    name: "self:payslips",
    resource: "self",
    action: "payslips",
    description: "View own payslips",
  },
];

// Self-service permissions every employee gets (own data only)
const EMPLOYEE_SELF_SERVICE = [
  "self:attendance",
  "self:leaves",
  "self:expenses",
  "self:payslips",
  "hr:leaves:create",       // submit own leave
  "hr:expenses:create",     // submit own expense
];

/**
 * EXACTLY 7 roles. No others exist.
 * CEO, HR, SALES, CUSTOMER_SUPPORT, ENGINEERING, DESIGN, VIDEO_EDITOR
 */
export const SYSTEM_ROLES = [
  "CEO",
  "HR",
  "SALES",
  "CUSTOMER_SUPPORT",
  "ENGINEERING",
  "DESIGN",
  "VIDEO_EDITOR",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  // CEO — full god-mode access to everything
  CEO: PERMISSIONS.map((p) => p.name),

  // HR — full HR module + employee management + settings + can view CRM/projects for admin
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
    "crm:leads:view",
    "crm:leads:create",
    "crm:leads:update",
    "crm:leads:assign",
    "crm:targets:view",
    "crm:reports:view",
    "projects:view",
    "projects:create",
    "projects:update",
    "projects:tickets:view",
    "reports:view",
    "reports:create",
    "reports:export",
    "settings:view",
    "settings:manage",
    "dashboard:sales:view",
    "dashboard:customer-executive:view",
    "dashboard:support:view",
  ],

  // SALES — own leads + projects + tickets
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

  // CUSTOMER_SUPPORT — own tickets + projects
  CUSTOMER_SUPPORT: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:support:view",
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  // ENGINEERING — can ONLY see projects/tasks assigned to them
  ENGINEERING: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",            // filtered to member projects
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:sprints:view",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  // DESIGN — can ONLY see projects/tasks assigned to them
  DESIGN: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  // VIDEO_EDITOR — can ONLY see projects/tasks assigned to them
  VIDEO_EDITOR: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],
};

export function getPermissionName(resource: string, action: string): string {
  return `${resource}:${action}`;
}

export function parsePermission(permission: string): { resource: string; action: string } {
  const [resource, action] = permission.split(":");
  return { resource: resource ?? "", action: action ?? "" };
}
