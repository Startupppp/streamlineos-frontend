"use client";

import { useState } from "react";
import { PositionsTable } from "./positions-table";
import { ReorgScenariosTab } from "./reorg-scenarios-tab";

type ActiveTab = "positions" | "scenarios";

export function PositionsPageContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("positions");

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "positions", label: "Positions" },
    { key: "scenarios", label: "Reorg Scenarios" },
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
      {activeTab === "positions" ? <PositionsTable /> : <ReorgScenariosTab />}
    </>
  );
}
