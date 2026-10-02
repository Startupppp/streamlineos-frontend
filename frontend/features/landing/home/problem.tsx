import { Section, SectionHeading } from "./section";

const PROBLEMS = [
  {
    title: "Tool sprawl",
    body: "HR lives in one app, deals in another, invoices in a third. Each has its own login, its own bill and its own copy of your customer list.",
  },
  {
    title: "Broken handoffs",
    body: "A deal closes and delivery starts from a forwarded email. A hire accepts and someone retypes their details into payroll.",
  },
  {
    title: "Reporting chaos",
    body: "Month-end means exporting from every system into one spreadsheet, then arguing about which number is right.",
  },
];

export function Problem() {
  return (
    <Section>
      <SectionHeading
        title="Growing companies end up running on a pile of tools"
        lede="Each one solved a problem when you bought it. Together they are the problem."
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <div key={problem.title} className="rounded-2xl border border-border/70 bg-card p-7">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{problem.title}</h3>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{problem.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
