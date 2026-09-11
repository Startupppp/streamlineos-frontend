import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Account, AccountType } from "@/types/accounting";
import { formatShortDate } from "@/lib/date-utils";

const TYPE_BADGE_CLASSES: Record<AccountType, string> = {
  ASSET: "border-primary/30 text-foreground bg-primary/5",
  LIABILITY: "border-status-warning-rule text-status-warning-ink bg-status-warning-surface",
  EQUITY: "border-status-info-rule text-status-info-ink bg-status-info-surface",
  INCOME: "border-status-success-rule text-status-success-ink bg-status-success-surface",
  EXPENSE: "border-status-danger-rule text-status-danger-ink bg-status-danger-surface",
};

interface AccountSummaryCardProps {
  account: Account;
  parentAccount: Account | undefined;
}

export function AccountSummaryCard({ account, parentAccount }: AccountSummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="text-dense font-medium text-muted-foreground leading-none uppercase tracking-wide">
              Code
            </p>
            <p className="mt-1.5 text-sm font-mono text-foreground">
              {account.code}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-dense font-medium text-muted-foreground leading-none uppercase tracking-wide">
              Type
            </p>
            <Badge
              variant="outline"
              className={`mt-1.5 ${TYPE_BADGE_CLASSES[account.accountType]}`}
            >
              {account.accountType}
            </Badge>
          </div>

          <div className="min-w-0">
            <p className="text-dense font-medium text-muted-foreground leading-none uppercase tracking-wide">
              Status
            </p>
            <Badge
              variant={account.isActive ? "default" : "secondary"}
              className="mt-1.5"
            >
              {account.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {parentAccount && (
            <div className="min-w-0">
              <p className="text-dense font-medium text-muted-foreground leading-none uppercase tracking-wide">
                Parent account
              </p>
              <Link
                href={`/accounting/coa/${parentAccount.id}`}
                className="mt-1.5 flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {parentAccount.code}
                </span>
                <span>{parentAccount.name}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          <div className="min-w-0">
            <p className="text-dense font-medium text-muted-foreground leading-none uppercase tracking-wide">
              Created
            </p>
            <p className="mt-1.5 text-sm text-foreground">
              {formatShortDate(account.createdAt)}
            </p>
          </div>
        </div>

        {account.description && (
          <div className="pt-4 border-t border-border/60">
            <p className="text-dense font-medium text-muted-foreground leading-none uppercase tracking-wide">
              Description
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {account.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
