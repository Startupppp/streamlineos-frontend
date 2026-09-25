"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { SimulationResult } from "./simulation-result";
import { useComparePolicy } from "@/hooks/api/hr/enterprise-ops-simulator";

export function CompareSimulator() {
  const [employeeId, setEmployeeId] = useState("");
  const [policyType, setPolicyType] = useState("leave");
  const [oldPolicyId, setOldPolicyId] = useState("");
  const [newPolicyId, setNewPolicyId] = useState("");
  const [params, setParams] = useState<{
    employeeId: string;
    oldPolicyId: number;
    newPolicyId: number;
    policyType: string;
  } | null>(null);

  const { data, isLoading, isError, error, refetch } = useComparePolicy(params);

  function handleRetry() {
    void refetch();
  }

  function handleCompare() {
    if (!employeeId || !oldPolicyId || !newPolicyId) return;
    setParams({
      employeeId,
      oldPolicyId: parseInt(oldPolicyId, 10),
      newPolicyId: parseInt(newPolicyId, 10),
      policyType,
    });
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <p className="text-sm font-medium">Compare Policies</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Employee</label>
            <UserCombobox
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="Select employee"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Policy Type</label>
            <Input placeholder="e.g. leave" value={policyType} onChange={(e) => setPolicyType(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Old Policy ID</label>
              <Input type="number" placeholder="ID" value={oldPolicyId} onChange={(e) => setOldPolicyId(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">New Policy ID</label>
              <Input type="number" placeholder="ID" value={newPolicyId} onChange={(e) => setNewPolicyId(e.target.value)} />
            </div>
          </div>
          <LoadingButton
            onClick={handleCompare}
            isPending={isLoading}
            loadingText="Comparing…"
            disabled={!employeeId || !oldPolicyId || !newPolicyId}
            className="w-full"
          >
            Compare policies
          </LoadingButton>
        </div>
      </div>
      {isError ? (
        <ErrorState
          title="Couldn't compare these policies"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <SimulationResult result={data ?? null} label="Old vs new policy comparison" />
      )}
    </div>
  );
}
