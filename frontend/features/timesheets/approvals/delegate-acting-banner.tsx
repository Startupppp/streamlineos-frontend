"use client";

import { UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BorrowedAuthority } from "./approval-standing";

interface DelegateActingBannerProps {
  authority: BorrowedAuthority | null;
  resolveName: (userId: string) => string;
  className?: string;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "another approver";
  if (names.length === 1) return names[0] ?? "another approver";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function DelegateActingBanner({
  authority,
  resolveName,
  className,
}: DelegateActingBannerProps) {
  if (!authority) return null;

  const names = joinNames(authority.approverIds.map(resolveName));
  const plural = authority.count === 1 ? "" : "s";
  const isOwner = authority.standing === "owner-override";

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
        isOwner
          ? "border-status-info-rule bg-status-info-surface text-status-info-ink"
          : "border-status-warning-rule bg-status-warning-surface text-status-warning-ink",
        className,
      )}
    >
      <UserCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {isOwner
            ? "You're approving as the organisation owner"
            : "You're approving as a delegate"}
        </p>
        <p className="text-dense">
          {authority.count} timesheet{plural} here {authority.count === 1 ? "is" : "are"}{" "}
          assigned to {names}.{" "}
          {isOwner
            ? "Owner override lets you decide anyway, and the decision is recorded against you."
            : "Your decision is recorded on their behalf, and will be refused if your delegation has ended."}
        </p>
      </div>
    </div>
  );
}
