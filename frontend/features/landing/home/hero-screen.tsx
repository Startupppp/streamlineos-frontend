import { Bar, Panel, Rec, Row, Tag } from "./frame";

const NAV: [string, string[]][] = [
  ["Sales", ["CRM", "Quotes", "Billing"]],
  ["Delivery", ["Build", "Timesheets"]],
  ["People", ["HR", "Recruitment", "Attendance", "Payroll"]],
  ["Finance", ["Accounting"]],
  ["Support", ["Helpdesk", "Customer Success"]],
];

const STAGES: [string, string, number][] = [
  ["Qualified", "₹31.2L", 100],
  ["Proposal", "₹24.9L", 80],
  ["Negotiation", "₹11.0L", 35],
  ["Won this month", "₹14.6L", 47],
];

const PROJECTS: [string, string, number][] = [
  ["Kestrel rollout", "Milestone 2 of 4", 46],
  ["Harbour onboarding", "Milestone 3 of 3", 88],
  ["Payroll audit", "Internal", 20],
];

/** The hero mockup: one workspace, every team's work on the same screen. */
export function HeroScreen() {
  return (
    <div className="flex">
      <aside className="hidden w-48 shrink-0 space-y-4 border-r border-(--lpf-rule) p-4 lg:block">
        {NAV.map(([group, apps]) => (
          <div key={group}>
            <div className="mb-1.5 text-dense text-(--lpf-dim)">{group}</div>
            {apps.map((app) => (
              <div
                key={app}
                className={`rounded-md px-2 py-1 text-xs ${app === "CRM" ? "bg-(--lpf-raise)" : "text-(--lpf-dim)"}`}
              >
                {app}
              </div>
            ))}
          </div>
        ))}
      </aside>

      <div className="grid min-w-0 flex-1 gap-3 p-3 sm:p-4 md:grid-cols-12">
        <Panel title="Pipeline" meta="26 open deals" className="md:col-span-5">
          <div className="space-y-3">
            {STAGES.map(([stage, value, pct]) => (
              <div key={stage}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-(--lpf-dim)">{stage}</span>
                  <span className="tabular-nums">{value}</span>
                </div>
                <Bar pct={pct} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <Rec>Kestrel Foods</Rec>
            <span className="text-(--lpf-dim)">Warehouse rollout, ₹18.4L</span>
            <Tag tone="accent">Quote sent</Tag>
          </div>
        </Panel>

        <Panel title="Projects" meta="3 active" className="md:col-span-4">
          <div className="space-y-3.5">
            {PROJECTS.map(([name, sub, pct], i) => (
              <div key={name}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  {i === 0 ? <Rec>{name}</Rec> : <span>{name}</span>}
                  <span className="text-dense text-(--lpf-dim)">{sub}</span>
                </div>
                <Bar pct={pct} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="People" meta="Today" className="md:col-span-3">
          <Row title="In today" right="47 of 52" />
          <Row title="On leave" right="3" />
          <Row title="March payroll" sub="Awaiting approval" right={<Tag tone="warn">Review</Tag>} />
        </Panel>

        <Panel title="Receivables" meta="₹11.4L outstanding" className="md:col-span-4">
          <Row title={<Rec>Kestrel Foods</Rec>} sub="INV-0142, due in 6 days" right="₹6.13L" />
          <Row title="Harbour Textiles" sub="INV-0139, 4 days overdue" right="₹2.40L" />
          <Row title="Nimbus Clinics" sub="INV-0137, due in 12 days" right="₹2.87L" />
        </Panel>

        <Panel title="Tickets" meta="5 open" className="md:col-span-4">
          <Row
            title={<Rec>Kestrel Foods</Rec>}
            sub="#2281 Scanner sync failing at Pune DC"
            right={<Tag tone="warn">High</Tag>}
          />
          <Row title="Harbour Textiles" sub="#2279 Add a second approver" right={<Tag>Normal</Tag>} />
          <Row title="Tamarind Labs" sub="#2274 Export leave balances" right={<Tag>Normal</Tag>} />
        </Panel>

        <Panel title="Timesheets" meta="This week" className="md:col-span-4">
          <Row title={<Rec>Kestrel rollout</Rec>} sub="6 people" right="142 h" />
          <Row title="Harbour onboarding" sub="3 people" right="61 h" />
          <Row title="Awaiting approval" sub="4 timesheets" right={<Tag tone="accent">Approve</Tag>} />
        </Panel>
      </div>
    </div>
  );
}
