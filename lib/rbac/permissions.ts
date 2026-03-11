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
  // Dashboard-specific permissions (role-isolated dashboards)
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
    name: "dashboard:marketing:view",
    resource: "dashboard:marketing",
    action: "view",
    description: "View Marketing dashboard",
  },
  {
    name: "dashboard:support:view",
    resource: "dashboard:support",
    action: "view",
    description: "View Support CRM dashboard",
  },
];

// Common self-service HR permissions for all employees
const EMPLOYEE_SELF_SERVICE = [
  "hr:attendance:view",
  "hr:leaves:view",
  "hr:leaves:create",
  "hr:payroll:view",
  "hr:salary:view",
  "hr:expenses:view",
  "hr:expenses:create",
  "hr:documents:view",
  "hr:performance:view",
  "hr:goals:view",
  "hr:goals:manage",
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  // CEO — sees everything
  CEO: PERMISSIONS.map((p) => p.name),

  // Admin — sees everything except RBAC management
  ADMIN: PERMISSIONS.filter((p) => !p.name.startsWith("settings:rbac")).map((p) => p.name),

  // HR — full HR suite + projects + reports
  HR: [
    ...PERMISSIONS.filter((p) => p.name.startsWith("hr:")).map((p) => p.name),
    "projects:view",
    "reports:view",
    "reports:create",
    "settings:view",
  ],

  // Sales — Sales dashboard + CRM leads/targets
  SALES: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:sales:view",
    "crm:leads:view",
    "crm:leads:create",
    "crm:leads:update",
    "crm:targets:view",
    "crm:targets:manage",
    "crm:reports:view",
    "reports:view",
  ],

  // Customer Executive — Customer Exec dashboard + CRM leads
  CUSTOMER_EXECUTIVE: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:customer-executive:view",
    "crm:leads:view",
    "crm:leads:create",
    "crm:leads:update",
    "crm:leads:assign",
    "crm:targets:view",
    "crm:reports:view",
    "reports:view",
  ],

  // Digital Marketing — Marketing dashboard + CRM + projects
  DIGITAL_MARKETING: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:marketing:view",
    "crm:leads:view",
    "crm:leads:create",
    "crm:leads:update",
    "crm:targets:view",
    "crm:reports:view",
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // Social Media Manager — Marketing dashboard + CRM
  SOCIAL_MEDIA_MANAGER: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:marketing:view",
    "crm:leads:view",
    "crm:leads:create",
    "crm:leads:update",
    "crm:targets:view",
    "crm:reports:view",
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // Graphic Designer — Projects only, no CRM dashboards
  GRAPHIC_DESIGNER: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // Video Editor — Projects only, no CRM dashboards
  VIDEO_EDITOR: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // Support — Support CRM dashboard
  SUPPORT: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:support:view",
    "crm:leads:view",
    "crm:leads:create",
    "crm:leads:update",
    "crm:reports:view",
    "reports:view",
  ],

  // Sales Manager — Sales dashboard + full CRM + manage targets
  SALES_MANAGER: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:sales:view",
    "crm:leads:view",
    "crm:leads:create",
    "crm:leads:update",
    "crm:leads:assign",
    "crm:leads:delete",
    "crm:targets:view",
    "crm:targets:manage",
    "crm:reports:view",
    "crm:reports:export",
    "reports:view",
    "reports:create",
  ],

  // Business Development — Sales dashboard + CRM leads
  BUSINESS_DEVELOPMENT: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:sales:view",
    "crm:leads:view",
    "crm:leads:create",
    "crm:leads:update",
    "crm:targets:view",
    "crm:targets:manage",
    "crm:reports:view",
    "reports:view",
  ],

  // Content Writer — Marketing dashboard + projects
  CONTENT_WRITER: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:marketing:view",
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // SEO Specialist — Marketing dashboard + CRM + projects
  SEO_SPECIALIST: [
    ...EMPLOYEE_SELF_SERVICE,
    "dashboard:marketing:view",
    "crm:leads:view",
    "crm:leads:create",
    "crm:reports:view",
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // UI/UX Designer — Projects only
  UI_UX_DESIGNER: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // Software Engineer — Projects + sprints
  SOFTWARE_ENGINEER: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:sprints:view",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // Frontend Developer — same as Software Engineer
  FRONTEND_DEVELOPER: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:sprints:view",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // Backend Developer — same as Software Engineer
  BACKEND_DEVELOPER: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:sprints:view",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // DevOps Engineer — projects + sprints
  DEVOPS_ENGINEER: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:sprints:view",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // QA Engineer — projects + sprints
  QA_ENGINEER: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:sprints:view",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // Tech Lead — projects with management + reports
  TECH_LEAD: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:create",
    "projects:update",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:tickets:assign",
    "projects:sprints:view",
    "projects:sprints:manage",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
    "reports:create",
  ],

  // Product Manager — projects with management + reports
  PRODUCT_MANAGER: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:create",
    "projects:update",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:tickets:assign",
    "projects:sprints:view",
    "projects:sprints:manage",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
    "reports:create",
  ],

  // Finance — HR payroll access + reports
  FINANCE: [
    ...EMPLOYEE_SELF_SERVICE,
    "hr:payroll:generate",
    "hr:payroll:approve",
    "hr:salary:manage",
    "hr:expenses:approve",
    "reports:view",
    "reports:create",
    "reports:export",
    "settings:view",
  ],

  // Accountant — same as Finance
  ACCOUNTANT: [
    ...EMPLOYEE_SELF_SERVICE,
    "hr:payroll:view",
    "hr:salary:view",
    "hr:expenses:view",
    "reports:view",
    "reports:create",
    "reports:export",
  ],

  // Operations — broad view access + reports
  OPERATIONS: [
    ...EMPLOYEE_SELF_SERVICE,
    "hr:employees:view",
    "hr:attendance:manage",
    "projects:view",
    "reports:view",
    "reports:create",
    "settings:view",
  ],

  // IT Support — basic projects + settings
  IT_SUPPORT: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],

  // Intern — minimal access
  INTERN: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:timesheets:view",
    "projects:timesheets:create",
  ],

  // Member — basic access, no specific dashboards
  MEMBER: [
    ...EMPLOYEE_SELF_SERVICE,
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:sprints:view",
    "projects:timesheets:view",
    "projects:timesheets:create",
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

