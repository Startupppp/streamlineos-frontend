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
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  OWNER: PERMISSIONS.map((p) => p.name),
  ADMIN: PERMISSIONS.filter((p) => !p.name.startsWith("settings:rbac")).map((p) => p.name),
  MEMBER: [
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
    "projects:view",
    "projects:tickets:view",
    "projects:tickets:create",
    "projects:tickets:update",
    "projects:sprints:view",
    "projects:timesheets:view",
    "projects:timesheets:create",
    "reports:view",
  ],
  CLIENT: [
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

