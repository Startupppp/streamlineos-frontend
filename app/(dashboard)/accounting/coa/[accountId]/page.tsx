"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/shared";
import { useAccounts } from "@/lib/api/hooks/accounting";
import type { AccountType } from "@/types/accounting";

interface AccountDetailPageProps {
  params: Promise<{ accountId: string }>;
}

const TYPE_BADGE_CLASSES: Record<AccountType, string> = {
  ASSET: "border-blue-300 text-blue-700",
  LIABILITY: "border-orange-300 text-orange-700",
  EQUITY: "border-purple-300 text-purple-700",
  INCOME: "border-green-300 text-green-700",
  EXPENSE: "border-amber-300 text-amber-700",
};

export default function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { accountId: accountIdStr } = use(params);
  const accountId = Number.parseInt(accountIdStr, 10);

  const query = useAccounts({ page: 1, pageSize: 200 });

  const account = query.data?.items.find((item) => item.id === accountId);

  return (
    <PageWrapper
      eyebrow="Accounting"
      title={account ? account.name : "Account"}
      subtitle={account ? `Code ${account.code}` : "Loading account details..."}
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accounting/coa">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to chart of accounts
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {query.isLoading ? (
          <LoadingState variant="form" rows={4} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load account"
            description={query.error.message}
          />
        ) : !account || !Number.isInteger(accountId) ? (
          <ErrorState
            title="Account not found"
            description="This account does not exist or you do not have access to it."
          />
        ) : (
          <>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
                      Code
                    </p>
                    <p className="mt-1 text-sm font-mono text-foreground">
                      {account.code}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
                      Name
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {account.name}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
                      Type
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-1 ${TYPE_BADGE_CLASSES[account.accountType]}`}
                    >
                      {account.accountType}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
                      Status
                    </p>
                    <Badge
                      variant={account.isActive ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {account.description && (
                  <div className="pt-4 border-t border-border/60">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 leading-none">
                      Description
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {account.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  Recent journal lines
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recent journal lines for this account: arriving in Session 2.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
