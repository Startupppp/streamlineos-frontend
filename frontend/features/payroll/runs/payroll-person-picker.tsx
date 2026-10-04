"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCanState } from "@/hooks/api/access";
import { usePayrollPeople } from "@/hooks/api/payroll/people";
import type { PayrollPerson } from "@/hooks/api/payroll/people-schema";
import { cn } from "@/lib/utils";

const INELIGIBLE_BADGE: Record<Exclude<PayrollPerson["eligibility"], "eligible">, string> = {
  "has-salary": "Has salary",
  "needs-payee-link": "Not payable yet",
  exited: "Exited",
};

export function personKey(person: PayrollPerson): string {
  if (person.payee?.kind === "user") return `user:${person.payee.userId}`;
  if (person.payee?.kind === "worker") return `worker:${person.payee.workerId}`;
  return `person:${person.organizationPersonId ?? person.email ?? person.displayName}`;
}

function existingProfileHref(person: PayrollPerson): string | null {
  if (person.payee?.kind === "user") return `/payroll/employees/${person.payee.userId}`;
  if (person.payee?.kind === "worker") return `/payroll/workers/${person.payee.workerId}`;
  return null;
}

interface PersonRowProps {
  person: PayrollPerson;
  selected: boolean;
  onPick: (person: PayrollPerson) => void;
}

function PersonRow({ person, selected, onPick }: PersonRowProps) {
  const eligible = person.eligibility === "eligible";
  const secondary = [person.email, person.employeeNumber].filter(Boolean).join(" · ");
  const profileHref = person.eligibility === "has-salary" ? existingProfileHref(person) : null;

  function handleClick() {
    onPick(person);
  }

  return (
    <li className="py-1">
      <button
        type="button"
        disabled={!eligible}
        aria-pressed={selected}
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
          eligible ? "hover:bg-accent" : "cursor-not-allowed opacity-70",
          selected && "bg-accent",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{person.displayName}</span>
          {secondary ? <span className="block truncate text-micro text-muted-foreground">{secondary}</span> : null}
        </span>
        {person.eligibility === "eligible" ? null : (
          <Badge variant="secondary">{INELIGIBLE_BADGE[person.eligibility]}</Badge>
        )}
      </button>
      {person.eligibility === "needs-payee-link" ? (
        <p className="px-2 text-micro leading-snug text-muted-foreground">
          Add them as a worker and mark as payee in Directory, or invite them.
          {person.organizationPersonId ? (
            <>
              {" "}
              <Link href={`/directory/${person.organizationPersonId}`} className="underline underline-offset-2">
                Open in Directory
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {profileHref ? (
        <p className="px-2 text-micro text-muted-foreground">
          <Link href={profileHref} className="underline underline-offset-2">
            Open existing profile
          </Link>
        </p>
      ) : null}
    </li>
  );
}

interface PayrollPersonPickerProps {
  enabled: boolean;
  selectedKey: string | null;
  onPick: (person: PayrollPerson) => void;
  label: string;
}

export function PayrollPersonPicker({ enabled, selectedKey, onPick, label }: PayrollPersonPickerProps) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const access = useCanState("payroll:salaries:view");
  const people = usePayrollPeople({ search: debounced }, { enabled });
  const rows = people.data?.data ?? [];

  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  function handleRetry() {
    void people.refetch();
  }

  let body: React.ReactNode;
  if (access === "denied") {
    body = (
      <p className="py-2 text-dense text-muted-foreground">
        Choosing a person needs access to view salaries. Ask a payroll admin to grant it.
      </p>
    );
  } else if (access === "loading" || people.isLoading) {
    body = (
      <div className="space-y-2 py-1" aria-label="Loading people">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    );
  } else if (people.isError) {
    body = (
      <div role="alert" className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
        <p className="text-dense text-muted-foreground">{getErrorMessage(people.error)}</p>
        <Button type="button" size="sm" variant="outline" onClick={handleRetry}>
          Retry
        </Button>
      </div>
    );
  } else if (rows.length === 0) {
    body = debounced ? (
      <p className="py-2 text-dense text-muted-foreground">No one matches &ldquo;{debounced}&rdquo;.</p>
    ) : (
      <p className="py-2 text-dense text-muted-foreground">
        No one in your directory yet.{" "}
        <Link href="/directory" className="underline underline-offset-2">
          Open Directory
        </Link>
      </p>
    );
  } else {
    body = (
      <>
        <ul className="max-h-72 overflow-y-auto divide-y divide-border" aria-label={label}>
          {rows.map((person) => (
            <PersonRow key={personKey(person)} person={person} selected={personKey(person) === selectedKey} onPick={onPick} />
          ))}
        </ul>
        {people.data?.pagination.hasMore ? (
          <p className="pt-1 text-micro text-muted-foreground">Showing first {rows.length} — refine search</p>
        ) : null}
      </>
    );
  }

  return (
    <div className="w-full space-y-2">
      <Input
        type="search"
        value={search}
        onChange={handleSearchChange}
        placeholder="Search by name, email or employee number…"
        aria-label={`Search ${label.toLowerCase()}`}
      />
      {body}
    </div>
  );
}
