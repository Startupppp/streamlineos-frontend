import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");

function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("permissioned action visibility", () => {
  it("keeps inventory catalogue actions aligned with product endpoint permissions", () => {
    const products = source("app/(authenticated)/inventory/products/page.tsx");
    const categories = source(
      "app/(authenticated)/inventory/products/categories/page.tsx",
    );
    const units = source("app/(authenticated)/inventory/products/uom/page.tsx");

    expect(products).toContain('useCan("inventory:products:create")');
    expect(products).toContain('useCan("inventory:products:update")');
    expect(products).toContain('useCan("inventory:products:delete")');
    expect(products).toContain('useCan("inventory:import")');
    expect(categories).toContain('useCan("inventory:products:create")');
    expect(categories).toContain('useCan("inventory:products:update")');
    expect(units).toContain('useCan("inventory:products:create")');
  });

  it("uses capability permissions instead of structural roles for CRM actions", () => {
    const contacts = source("app/(authenticated)/crm/contacts/page.tsx");
    const contactActions = source(
      "features/crm/contacts/contact-actions-menu.tsx",
    );
    const leads = source("app/(authenticated)/crm/leads/page.tsx");

    expect(contacts).toContain('useCan("crm:contacts:manage")');
    expect(contacts).toContain('useCan("crm:contacts:merge")');
    expect(contactActions).toContain('useCan("crm:ai:use")');
    expect(contactActions).toContain('useCan("crm:contacts:manage")');
    expect(contactActions).toContain('useCan("crm:contacts:merge")');
    expect(leads).toContain('useCan("crm:leads:create")');
    expect(leads).toContain('useCan("crm:leads:update")');
    expect(leads).toContain('useCan("crm:leads:assign")');
    expect(leads).toContain('useCan("crm:leads:delete")');
    expect(leads).toContain('useCan("crm:deals:create")');
    expect(leads).not.toContain("ADMIN_ROLES");
    expect(leads).not.toContain("useSession");
  });

  it.each([
    "features/crm/leads/ai-score-button.tsx",
    "features/crm/leads/ai-bulk-score-button.tsx",
    "features/crm/leads/ai-next-action-button.tsx",
    "features/crm/leads/ai-enrich-lead-button.tsx",
    "features/crm/leads/ai-email-dialog.tsx",
  ])("hides CRM AI action in %s without CRM AI permission", (fileName) => {
    expect(source(fileName)).toContain('useCan("crm:ai:use")');
  });

  it("gates Build, HR, and Accounting mutations with endpoint permissions", () => {
    const epicsPage = source(
      "app/(authenticated)/build/[projectId]/epics/page.tsx",
    );
    const epicCard = source("features/build/epics/epic-card.tsx");
    const requisitions = source(
      "app/(authenticated)/hr/recruitment/requisitions/page.tsx",
    );
    const hrHubAccess = source("features/hr/hub/use-hr-hub-access.ts");
    const employeeList = source(
      "features/hr/employees/employees-list-page.tsx",
    );
    const employeeTable = source(
      "features/hr/employees/hr-employee-table.tsx",
    );
    const onboarding = source(
      "app/(authenticated)/hr/onboarding/page.tsx",
    );
    const account = source(
      "app/(authenticated)/accounting/coa/[accountId]/page.tsx",
    );

    expect(epicsPage).toContain('useCan("build:tickets:create")');
    expect(epicCard).toContain('useCan("build:tickets:create")');
    expect(epicCard).toContain('useCan("build:tickets:update")');
    expect(epicCard).toContain('useCan("build:tickets:delete")');
    expect(requisitions).toContain('useCan("hr:requisitions:manage")');
    expect(hrHubAccess).toContain('useCan("hr:onboarding:manage")');
    expect(hrHubAccess).toContain('useCan("hr:requisitions:manage")');
    expect(hrHubAccess).toContain('useCan("payroll:runs:create")');
    expect(employeeList).toContain('useCan("hr:onboarding:manage")');
    expect(employeeList).toContain('useCan("hr:export:manage")');
    expect(employeeTable).toContain('useCan("hr:employees:update")');
    expect(employeeTable).toContain('useCan("hr:exit:manage")');
    expect(onboarding).toContain('useCan("hr:onboarding:manage")');
    expect(onboarding).toContain('useCan("hr:documents:manage")');
    expect(onboarding).toContain('useCan("hr:documents:view")');
    expect(onboarding).toContain('useCan("hr:probation:view")');
    expect(account).toContain('useCan("accounting:accounts:update")');
    expect(account).toContain('useCan("accounting:journal:manage")');
  });

  it("gates Support, Surveys, Payroll, Sign, Timesheets, and Administration actions", () => {
    const supportChannels = source(
      "app/(authenticated)/support/settings/channels/page.tsx",
    );
    const surveyHeader = source(
      "features/surveys/builder/survey-builder-header.tsx",
    );
    const payrollComponents = source(
      "features/payroll/components/components-page.tsx",
    );
    const signTemplates = source("features/sign/templates/template-list.tsx");
    const timesheetPayroll = source(
      "features/timesheets/payroll/payroll-page-client.tsx",
    );
    const adminWebhooks = source(
      "app/(authenticated)/settings/webhooks/page.tsx",
    );

    expect(supportChannels).toContain('useCan("support:channels:manage")');
    expect(surveyHeader).toContain('useCan("surveys:publish")');
    expect(surveyHeader).toContain('useCan("surveys:delete")');
    expect(surveyHeader).toContain('useCan("surveys:create")');
    expect(surveyHeader).toContain('useCan("surveys:live:host")');
    expect(payrollComponents).toContain('useCan("payroll:components:manage")');
    expect(signTemplates).toContain('useCan("sign:template:manage")');
    expect(signTemplates).toContain('useCan("sign:envelope:create")');
    expect(timesheetPayroll).toContain(
      'useCan("timesheets:payroll:export")',
    );
    expect(adminWebhooks).toContain('useCan("settings:webhooks:manage")');
  });
});
