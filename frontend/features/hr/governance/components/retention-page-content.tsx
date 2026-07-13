"use client";

import { useState } from "react";
import { RetentionPoliciesTab } from "./retention-policies-tab";
import { DataRequestsTab } from "./data-requests-tab";

type ActiveTab = "policies" | "requests";

export function RetentionPageContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("policies");

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "policies", label: "Retention Policies" },
    { key: "requests", label: "Data Requests" },
  ];

  return (
    <>
      <div className="flex gap-1 border-b mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "policies" ? <RetentionPoliciesTab /> : <DataRequestsTab />}
    </>
  );
}
