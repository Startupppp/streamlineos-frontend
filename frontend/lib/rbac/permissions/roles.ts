import { MODULE_ACCESS_PERMISSIONS } from "./module-access";
import { AUDIT_LOG_PERMISSIONS } from "./audit-log";
import { BILLING_PERMISSIONS } from "./billing";
import { BRANCH_PERMISSIONS } from "./branch";
import { BUILD_PERMISSIONS } from "./build";
import { CALENDAR_PERMISSIONS } from "./calendar";
import { REPORTS_PERMISSIONS } from "./reports";
import { SALES_PERMISSIONS } from "./sales";
import { SELF_PERMISSIONS } from "./self";
import { SETTINGS_PERMISSIONS } from "./settings";
import { SIGN_PERMISSIONS } from "./sign";
import { TASKS_PERMISSIONS } from "./tasks";
import { WORKFLOWS_PERMISSIONS } from "./workflows";
import { HR_PERMISSIONS } from "./hr";
import { CRM_PERMISSIONS } from "./crm";
import { SHARED_PERMISSIONS } from "./shared";
import { SUPPORT_PERMISSIONS } from "./support";
import { KB_PERMISSIONS } from "./kb";
import { INVENTORY_PERMISSIONS } from "./inventory";
import { SURVEYS_PERMISSIONS } from "./surveys";
import { FEEDBUCKET_PERMISSIONS } from "./feedbucket";
import { NOTIFICATIONS_PERMISSIONS } from "./notifications";
import { ACCOUNTING_PERMISSIONS } from "./accounting";
import { PAYROLL_PERMISSIONS } from "./payroll";
import { OWNERSHIP_PERMISSIONS } from "./ownership";
import { DIRECTORY_PERMISSIONS } from "./directory";

const permissionEntries = [
  ...HR_PERMISSIONS,
  ...CRM_PERMISSIONS,
  ...SHARED_PERMISSIONS,
  ...SUPPORT_PERMISSIONS,
  ...KB_PERMISSIONS,
  ...INVENTORY_PERMISSIONS,
  ...SURVEYS_PERMISSIONS,
  ...FEEDBUCKET_PERMISSIONS,
  ...NOTIFICATIONS_PERMISSIONS,
  ...ACCOUNTING_PERMISSIONS,
  ...PAYROLL_PERMISSIONS,
  ...OWNERSHIP_PERMISSIONS,
  ...DIRECTORY_PERMISSIONS,
  ...AUDIT_LOG_PERMISSIONS,
  ...BILLING_PERMISSIONS,
  ...BRANCH_PERMISSIONS,
  ...BUILD_PERMISSIONS,
  ...CALENDAR_PERMISSIONS,
  ...REPORTS_PERMISSIONS,
  ...SALES_PERMISSIONS,
  ...SELF_PERMISSIONS,
  ...SETTINGS_PERMISSIONS,
  ...SIGN_PERMISSIONS,
  ...TASKS_PERMISSIONS,
  ...WORKFLOWS_PERMISSIONS,
  ...MODULE_ACCESS_PERMISSIONS,
];

export const PERMISSIONS = [
  ...new Map(permissionEntries.map((permission) => [permission.name, permission])).values(),
];

