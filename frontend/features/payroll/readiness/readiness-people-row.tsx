"use client";

import Link from "next/link";
import { AlertOctagon, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { PayrollPeopleReadiness } from "@/hooks/api/payroll/people-schema";

const SAMPLE_LIMIT = 5;

function peopleCount(n: number): string {
  return n === 1 ? "1 person" : `${n} people`;
}

interface PeopleVerdict {
  blocked: boolean;
  detail: string;
  action: { label: string; href: string } | null;
}

export function peopleVerdict(people: PayrollPeopleReadiness): PeopleVerdict {
  if (people.payable === 0) {
    return {
      blocked: true,
      detail: "No one can be paid yet",
      action: { label: "Open Directory", href: "/directory" },
    };
  }
  if (people.payableWithoutSalary > 0) {
    const names = people.payableWithoutSalarySample.slice(0, SAMPLE_LIMIT).map((p) => p.displayName);
    const rest = people.payableWithoutSalary - names.length;
    const list = names.length > 0 ? `: ${names.join(", ")}${rest > 0 ? ` and ${rest} more` : ""}` : "";
    return {
      blocked: true,
      detail: `${peopleCount(people.payableWithoutSalary)} can be paid but ${people.payableWithoutSalary === 1 ? "has" : "have"} no salary${list}`,
      action: { label: "Assign salaries", href: "/payroll/employees" },
    };
  }
  return {
    blocked: false,
    detail: `${peopleCount(people.payable)} ready, all with salaries`,
    action: null,
  };
}

interface ReadinessPeopleRowProps {
  people: PayrollPeopleReadiness;
}

export function ReadinessPeopleRow({ people }: ReadinessPeopleRowProps) {
  const verdict = peopleVerdict(people);
  const Icon = verdict.blocked ? AlertOctagon : CheckCircle2;
  const tone = statusToneClasses(verdict.blocked ? "danger" : "success");

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="People and salaries">
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone.ink)} aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-dense font-medium text-foreground">People &amp; salaries</p>
          <p className="text-micro leading-snug text-muted-foreground">{verdict.detail}</p>
          {people.needsPayeeLink > 0 ? (
            <p className="flex items-start gap-1 text-micro leading-snug text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>
                {peopleCount(people.needsPayeeLink)} in Directory {people.needsPayeeLink === 1 ? "isn't" : "aren't"} payable yet.
                {verdict.action?.href === "/directory" ? null : (
                  <>
                    {" "}
                    <Link href="/directory" className="underline underline-offset-2">
                      Open Directory
                    </Link>
                  </>
                )}
              </span>
            </p>
          ) : null}
        </div>
        {verdict.action ? (
          <Button size="sm" className="h-7 shrink-0 text-xs" asChild>
            <Link href={verdict.action.href}>{verdict.action.label}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
