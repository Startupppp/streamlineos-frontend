"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCircle, CheckCircle, Search } from "lucide-react";
import { useExitVerification } from "@/hooks/api/hr/enterprise-ops-identity";

export function ExitVerificationView() {
  const [userId, setUserId] = useState("");
  const [queryId, setQueryId] = useState("");

  const { data, isLoading } = useExitVerification(queryId);

  function handleSearch() {
    setQueryId(userId.trim());
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          Verify that all system access has been revoked before completing an employee exit.
          Exit cannot proceed while there are unverified revokes pending.
        </p>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <UserCombobox
              value={userId}
              onChange={setUserId}
              placeholder="Select employee"
            />
          </div>
          <Button onClick={handleSearch} disabled={!userId.trim()} variant="outline" size="sm">
            <Search className="mr-1.5 h-4 w-4" />
            Check
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="animate-pulse h-16 bg-muted rounded-xl" />
      )}

      {!queryId && !isLoading && (
        <EmptyState
          illustrationPreset="security"
          title="Select an employee to verify"
          description="Choose an employee above to check whether all system access has been revoked and verified."
          compact
        />
      )}

      {data && !isLoading && (
        <div className={`rounded-xl border p-4 ${data.hasUnverifiedRevokes ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10" : "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"}`}>
          <div className="flex items-center gap-2 mb-3">
            {data.hasUnverifiedRevokes ? (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-300" />
            ) : (
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            )}
            <span className={`font-medium text-sm ${data.hasUnverifiedRevokes ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
              {data.hasUnverifiedRevokes
                ? `${data.unverified.length} unverified revoke(s) pending`
                : "All access revoked and verified"}
            </span>
          </div>

          {data.unverified.length > 0 && (
            <div className="space-y-2">
              {data.unverified.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md bg-card/60 border border-red-200/50 dark:border-red-500/30 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{r.systemName}</span>
                  <Badge variant="outline" className="text-xs capitalize bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30">
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Total provisioning records: {data.total}
          </p>
        </div>
      )}
    </div>
  );
}
