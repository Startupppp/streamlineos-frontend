"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { AlertCircle, CheckCircle, Search } from "lucide-react";
import { useExitVerification } from "@/hooks/api/hr/enterprise-ops-identity";

export function ExitVerificationView() {
  const [userId, setUserId] = useState("");
  const [queryId, setQueryId] = useState("");

  const { data, isLoading, isError, error, refetch } = useExitVerification(queryId);

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

      {!queryId && !isLoading && !isError && (
        <EmptyState
          illustrationPreset="security"
          title="Select an employee to verify"
          description="Choose an employee above to check whether all system access has been revoked and verified."
          compact
        />
      )}

      {isError && queryId && (
        <ErrorState
          title="Couldn't load exit verification"
          description={getErrorMessage(error)}
          onRetry={refetch}
          compact
        />
      )}

      {data && !isLoading && !isError && (
        <div className={`rounded-xl border p-4 ${data.hasUnverifiedRevokes ? "border-status-danger-rule bg-status-danger-surface" : "border-status-success-rule bg-status-success-surface"}`}>
          <div className="flex items-center gap-2 mb-3">
            {data.hasUnverifiedRevokes ? (
              <AlertCircle className="h-5 w-5 text-status-danger-ink" />
            ) : (
              <CheckCircle className="h-5 w-5 text-status-success-ink" />
            )}
            <span className={`font-medium text-sm ${data.hasUnverifiedRevokes ? "text-status-danger-ink" : "text-status-success-ink"}`}>
              {data.hasUnverifiedRevokes
                ? `${data.unverified.length} unverified revoke(s) pending`
                : "All access revoked and verified"}
            </span>
          </div>

          {data.unverified.length > 0 && (
            <div className="space-y-2">
              {data.unverified.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md bg-card/60 border border-status-danger-rule px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{r.systemName}</span>
                  <Badge variant="outline" className="text-xs capitalize bg-status-danger-surface text-status-danger-ink border-status-danger-rule">
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
