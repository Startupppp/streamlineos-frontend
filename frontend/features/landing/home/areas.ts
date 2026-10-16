/**
 * The five areas of the business and the modules in each. The navbar's product
 * menu and the module tabs both read this list, so they can never disagree.
 */
export const AREAS = [
  { id: "sales", label: "Sales", apps: ["CRM", "Sales", "Quotes"] },
  { id: "delivery", label: "Delivery", apps: ["Build", "Timesheets"] },
  { id: "people", label: "People", apps: ["HR", "Recruitment", "Attendance", "Payroll", "Performance"] },
  { id: "finance", label: "Finance", apps: ["Billing", "Accounting"] },
  { id: "support", label: "Support", apps: ["Helpdesk", "Customer Success"] },
] as const;

export const MODULE_COUNT = AREAS.reduce((total, area) => total + area.apps.length, 0);
