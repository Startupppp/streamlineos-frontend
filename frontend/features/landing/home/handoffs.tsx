import type { ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { Bar, Frame, Panel, Rec, Row, Tag } from "./frame";

/** The seam between two modules: what the second one inherits from the first. */
function Carried({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 text-dense text-(--lpf-dim)">
      <ArrowDown className="size-3.5 text-(--lpf-accent)" aria-hidden />
      {children}
    </div>
  );
}

export function WinToDeliver() {
  return (
    <Frame crumb="Quotes" label="Mockup: an accepted quote for Kestrel Foods becomes a project with the same customer, work and price.">
      <div className="space-y-3 p-3 sm:p-5">
        <Panel title="Quote Q-0318" meta={<Tag tone="good">Accepted</Tag>}>
          <Row title={<Rec>Kestrel Foods</Rec>} sub="Warehouse rollout" right="₹18.4L" />
          <Row title="Setup, in 4 stages" right="₹15.6L" />
          <Row title="Training, 2 sites" right="₹2.8L" />
        </Panel>
        <Carried>Customer, work and price copied into the project</Carried>
        <Panel title="Project: Kestrel rollout" meta="Projects">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <Rec>Kestrel Foods</Rec>
            <Tag>4 stages</Tag>
            <Tag>Owner: Anika Rao</Tag>
          </div>
          <Bar pct={8} />
          <div className="mt-2 text-dense text-(--lpf-dim)">Kickoff scheduled</div>
        </Panel>
      </div>
    </Frame>
  );
}

export function HireToPayroll() {
  return (
    <Frame crumb="Recruitment" label="Mockup: a candidate who accepts an offer becomes an employee, and their details flow into attendance and payroll.">
      <div className="space-y-3 p-3 sm:p-5">
        <Panel title="Implementation lead" meta="Offer">
          <Row title={<Rec>Anika Rao</Rec>} sub="4 interviews done" right={<Tag tone="good">Offer accepted</Tag>} />
        </Panel>
        <Carried>Details move into HR, with no retyping</Carried>
        <Panel title="Employee" meta="HR">
          <div className="mb-3 text-xs">
            <Rec>Anika Rao</Rec>
          </div>
          <Row title="Onboarding" sub="Documents and bank details collected" right={<Tag tone="good">Done</Tag>} />
          <Row title="Attendance" sub="This month" right="21 of 22 days" />
          <Row title="Payroll" sub="March salary" right={<Tag tone="accent">Added</Tag>} />
        </Panel>
      </div>
    </Frame>
  );
}

export function PaidAndBooks() {
  return (
    <Frame crumb="Billing" label="Mockup: an invoice to Kestrel Foods next to the project hours behind it and the matching entry in the accounts.">
      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-5">
        <Panel title="Invoice INV-0142" meta={<Tag tone="accent">Sent</Tag>} className="sm:col-span-2">
          <Row title={<Rec>Kestrel Foods</Rec>} sub="Stage 1 of Kestrel rollout" right="₹6,13,600" />
        </Panel>
        <Panel title="Project cost" meta="Timesheets">
          <Row title="Hours logged" right="412 h" />
          <Row title="Budgeted" right="440 h" />
        </Panel>
        <Panel title="Accounts" meta={<Tag tone="good">Recorded</Tag>}>
          <Row title="Owed by customer" right="₹6,13,600" />
          <Row title="Sales and GST" right="₹6,13,600" />
        </Panel>
      </div>
    </Frame>
  );
}

export function SupportWithContext() {
  return (
    <Frame crumb="Helpdesk" label="Mockup: a support ticket from Kestrel Foods shown beside that customer's deal, project and invoice.">
      <div className="grid gap-3 p-3 sm:grid-cols-5 sm:p-5">
        <Panel title="#2281 Warehouse scanners not updating" meta={<Tag tone="warn">High</Tag>} className="sm:col-span-3">
          <div className="rounded-lg bg-(--lpf-raise) p-3 text-xs leading-relaxed">
            Scanners at the Pune warehouse stopped updating stock after this morning’s count.
          </div>
          <div className="mt-3 text-dense text-(--lpf-dim)">Assigned to Rhea Thomas</div>
        </Panel>
        <Panel title="Account" meta="Same customer" className="sm:col-span-2">
          <div className="mb-3 text-xs">
            <Rec>Kestrel Foods</Rec>
          </div>
          <Row title="Deal" right="₹18.4L" />
          <Row title="Project" right="46%" />
          <Row title="Invoice" right="Due in 6 days" />
        </Panel>
      </div>
    </Frame>
  );
}
