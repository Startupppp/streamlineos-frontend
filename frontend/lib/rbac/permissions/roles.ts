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

export const PERMISSIONS = [
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
];

