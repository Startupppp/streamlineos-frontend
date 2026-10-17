import { Bar, Panel, Rec, Row, Tag } from "./frame";

type Deal = { company: string; what: string; value: string; note?: string; rec?: boolean };

const PIPELINE: { stage: string; total: string; deals: Deal[] }[] = [
  {
    stage: "Qualified",
    total: "₹31.2L",
    deals: [
      { company: "Nimbus Clinics", what: "HR and payroll rollout", value: "₹9.6L" },
      { company: "Tamarind Labs", what: "Helpdesk migration", value: "₹4.2L" },
    ],
  },
  {
    stage: "Proposal",
    total: "₹24.9L",
    deals: [
      { company: "Kestrel Foods", what: "Warehouse rollout", value: "₹18.4L", note: "Quote Q-0318 sent", rec: true },
      { company: "Harbour Textiles", what: "Field sales CRM", value: "₹6.5L" },
    ],
  },
  {
    stage: "Won",
    total: "₹14.6L",
    deals: [{ company: "Harbour Textiles", what: "Onboarding package", value: "₹8.2L", note: "Project created" }],
  },
];

export function SalesScreen() {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-3 sm:p-4">
      {PIPELINE.map((col) => (
        <Panel key={col.stage} title={col.stage} meta={col.total}>
          <div className="space-y-2">
            {col.deals.map((deal) => (
              <div key={deal.company + deal.what} className="rounded-lg bg-(--lpf-raise) p-3">
                <div className="text-xs">{deal.rec ? <Rec>{deal.company}</Rec> : deal.company}</div>
                <div className="mt-1.5 text-dense text-(--lpf-dim)">{deal.what}</div>
                <div className="mt-2.5 flex items-center justify-between gap-2 text-dense">
                  <span className="tabular-nums">{deal.value}</span>
                  {deal.note ? <Tag tone="accent">{deal.note}</Tag> : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ))}
      <Panel title="Forecast, this quarter" meta="₹39.5L best case" className="sm:col-span-3">
        <Bar pct={37} />
        <div className="mt-2 text-dense text-(--lpf-dim)">₹14.6L won so far</div>
      </Panel>
    </div>
  );
}

export function DeliveryScreen() {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-3 sm:p-4">
      <Panel title="Kestrel rollout" meta="Cycle 4" className="sm:col-span-2">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-dense text-(--lpf-dim)">
          Customer <Rec>Kestrel Foods</Rec> from deal ₹18.4L
        </div>
        <Row title="Map warehouse zones to stock locations" sub="Anika Rao" right={<Tag tone="good">Done</Tag>} />
        <Row title="Import item master, 4,200 rows" sub="Dev Malhotra" right={<Tag tone="accent">In progress</Tag>} />
        <Row title="Configure scanner sync for Pune DC" sub="Anika Rao" right={<Tag tone="accent">In progress</Tag>} />
        <Row title="Train floor supervisors" sub="Unassigned" right={<Tag>To do</Tag>} />
      </Panel>
      <div className="space-y-3">
        <Panel title="Cycle progress" meta="9 of 16 tasks">
          <Bar pct={56} />
          <div className="mt-2 text-dense text-(--lpf-dim)">Ends Friday</div>
        </Panel>
        <Panel title="Time logged" meta="This week">
          <Row title="Anika Rao" right="38 h" />
          <Row title="Dev Malhotra" right="41 h" />
          <Row title="Team total" right="142 h" />
        </Panel>
      </div>
    </div>
  );
}

const ROSTER: [string, string, string, "good" | "warn" | "neutral"][] = [
  ["Anika Rao", "Implementation lead", "In", "good"],
  ["Dev Malhotra", "Engineer", "In", "good"],
  ["Sana Qureshi", "Account executive", "On leave", "warn"],
  ["Rhea Thomas", "Support specialist", "In", "good"],
];

export function PeopleScreen() {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-3 sm:p-4">
      <Panel title="Team" meta="52 people" className="sm:col-span-2">
        {ROSTER.map(([name, role, status, tone], i) => (
          <Row
            key={name}
            title={i === 0 ? <Rec>{name}</Rec> : name}
            sub={role}
            right={<Tag tone={tone}>{status}</Tag>}
          />
        ))}
      </Panel>
      <div className="space-y-3">
        <Panel title="March payroll" meta="52 payslips">
          <Row title="Attendance locked" right={<Tag tone="good">Done</Tag>} />
          <Row title="Leave reconciled" right={<Tag tone="good">Done</Tag>} />
          <Row title="Approval" right={<Tag tone="warn">Waiting</Tag>} />
        </Panel>
        <Panel title="Hiring" meta="2 open roles">
          <Row title="Support specialist" sub="3 in interview" />
          <Row title="Account executive" sub="1 offer out" />
        </Panel>
      </div>
    </div>
  );
}

export function FinanceScreen() {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
      <Panel title="Invoices" meta="₹11.4L outstanding">
        <Row title={<Rec>Kestrel Foods</Rec>} sub="INV-0142, milestone 1" right="₹6.13L" />
        <Row title="Harbour Textiles" sub="INV-0139, overdue" right="₹2.40L" />
        <Row title="Nimbus Clinics" sub="INV-0137" right="₹2.87L" />
        <Row title="Tamarind Labs" sub="INV-0133" right={<Tag tone="good">Paid</Tag>} />
      </Panel>
      <Panel title="Journal" meta="INV-0142">
        <Row title="Accounts receivable" sub="Debit" right="₹6,13,600" />
        <Row title="Service revenue" sub="Credit" right="₹5,20,000" />
        <Row title="GST payable" sub="Credit" right="₹93,600" />
        <div className="mt-3 flex items-center justify-between text-dense text-(--lpf-dim)">
          <span>Balanced</span>
          <Tag tone="good">Posted</Tag>
        </div>
      </Panel>
    </div>
  );
}

export function SupportScreen() {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-3 sm:p-4">
      <Panel title="#2281 Scanner sync failing at Pune DC" meta={<Tag tone="warn">High</Tag>} className="sm:col-span-2">
        <div className="space-y-2">
          <div className="rounded-lg bg-(--lpf-raise) p-3 text-xs leading-relaxed">
            Scanners at the Pune DC stopped syncing after this morning&apos;s stock count. Receiving is on paper for now.
            <div className="mt-2 text-dense text-(--lpf-dim)">Kestrel Foods, 09:14</div>
          </div>
          <div className="rounded-lg border border-(--lpf-rule) p-3 text-xs leading-relaxed">
            Thanks, I can see the sync task is still open on your rollout. Looping in Anika, who is configuring it.
            <div className="mt-2 text-dense text-(--lpf-dim)">Rhea Thomas, 09:21</div>
          </div>
        </div>
      </Panel>
      <Panel title="Customer" meta="Shared record">
        <div className="mb-3 text-xs">
          <Rec>Kestrel Foods</Rec>
        </div>
        <Row title="Deal" sub="Warehouse rollout" right="₹18.4L" />
        <Row title="Project" sub="Kestrel rollout" right="46%" />
        <Row title="Last invoice" sub="INV-0142" right="Due in 6 d" />
      </Panel>
    </div>
  );
}
