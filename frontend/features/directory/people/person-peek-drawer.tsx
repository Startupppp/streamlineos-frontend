"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PersonDrawer, type PersonSummary } from "@/components/shared/person-drawer";
import type { OrganizationPerson } from "@/types/directory/people";
import { getPersonAccessBadge } from "./person-account-access";

interface PersonPeekDrawerProps {
  person: OrganizationPerson | null;
  basePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function personFullName(person: OrganizationPerson): string {
  return person.displayName ?? `${person.firstName} ${person.lastName}`.trim();
}

function toPersonSummary(person: OrganizationPerson): PersonSummary {
  return {
    userId: person.userId ?? person.organizationPersonId,
    name: personFullName(person),
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.workEmail,
    image: person.avatarUrl,
    isActive: person.deletedAt === null,
    hasAccepted: person.accountAccess.state === "MEMBER",
  };
}

function PeekRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1.5 last:border-b-0">
      <dt className="text-dense text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-label font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function PersonPeekDrawer({
  person,
  basePath,
  open,
  onOpenChange,
}: PersonPeekDrawerProps) {
  if (!person) return null;
  const profileHref = `${basePath}/${person.organizationPersonId}`;

  return (
    <PersonDrawer
      open={open}
      onOpenChange={onOpenChange}
      person={toPersonSummary(person)}
      profileHref={profileHref}
      sections={{
        overview: (
          <div className="flex flex-col gap-3">
            <dl className="flex flex-col">
              <PeekRow label="Work email" value={person.workEmail ?? "—"} />
              <PeekRow label="Personal email" value={person.personalEmail ?? "—"} />
              <PeekRow label="Phone" value={person.phone ?? "—"} />
              <PeekRow label="App access" value={getPersonAccessBadge(person)} />
            </dl>
            <p className="text-dense text-muted-foreground">
              Employment, time, pay and documents live on the person record, not on the
              directory row.
            </p>
            <Link
              href={profileHref}
              className="inline-flex items-center gap-1 text-label font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Open the full person record
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        ),
      }}
      hiddenSections={["pay"]}
    />
  );
}
