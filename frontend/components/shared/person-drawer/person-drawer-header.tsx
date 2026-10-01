"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  personStatusLabel,
  type PersonDrawerException,
  type PersonSummary,
} from "./person-summary";

interface PersonDrawerHeaderProps {
  person: PersonSummary;
  profileHref?: string;
  exceptions?: PersonDrawerException[];
}

export function PersonDrawerHeader({
  person,
  profileHref,
  exceptions = [],
}: PersonDrawerHeaderProps) {
  const status = personStatusLabel(person);
  const tone = statusToneClasses(
    status === "Active" ? "success" : status === "Inactive" ? "neutral" : "warning",
  );
  const metaParts = [
    person.designation,
    person.departmentName,
    person.reportingToName ? `Reports to ${person.reportingToName}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={resolveImageUrl(person.image)} alt="" />
          <AvatarFallback className="bg-status-info-surface text-status-info-ink text-xs font-bold">
            {getUserInitials(person)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-foreground">
              {getUserDisplayName(person)}
            </p>
            {person.employeeId ? (
              <span className="font-mono text-micro text-muted-foreground">
                {person.employeeId}
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-micro font-semibold",
                tone.surface,
                tone.inkStrong,
                tone.rule,
              )}
            >
              {status}
            </span>
          </div>
          {metaParts.length > 0 ? (
            <p className="truncate text-dense text-muted-foreground">
              {metaParts.join(" · ")}
            </p>
          ) : null}
        </div>
        {profileHref ? (
          <Button variant="outline" size="sm" className="shrink-0 gap-1" asChild>
            <Link href={profileHref}>
              Profile
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>

      {exceptions.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {exceptions.map((exception) => (
            <li key={exception.id}>
              <Link
                href={exception.href}
                className="flex items-center justify-between gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-2.5 py-1.5 text-dense text-status-warning-ink-strong transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{exception.label}</span>
                  {exception.detail ? ` · ${exception.detail}` : ""}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
