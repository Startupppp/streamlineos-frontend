import { Section, SectionHeading } from "./section";

const SHARED = [
  {
    record: "Customers",
    body: "One company and contact record, from first call to renewal.",
    modules: ["CRM", "Sales", "Quotes", "Billing", "Helpdesk", "Customer Success"],
  },
  {
    record: "Projects",
    body: "The work that was sold is the work that gets planned and tracked.",
    modules: ["Build", "Timesheets"],
  },
  {
    record: "People",
    body: "One employee record and org chart behind every module and permission.",
    modules: ["HR", "Recruitment", "Attendance", "Payroll", "Performance"],
  },
];

export function Connected() {
  return (
    <Section>
      <div className="rounded-3xl border border-border/70 bg-card p-7 sm:p-12">
        <SectionHeading
          title="Connected by design, not by connectors"
          lede="The modules were built on the same records, so there is nothing to sync and no integration to maintain between them."
        />
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {SHARED.map((item) => (
            <div key={item.record} className="border-t border-border pt-6">
              <h3 className="w-fit rounded-md border border-status-info-rule bg-status-info-surface px-2 py-0.5 text-sm font-medium text-brand-deep">
                {item.record}
              </h3>
              <p className="mt-4 leading-relaxed text-foreground">{item.body}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Used by {item.modules.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
