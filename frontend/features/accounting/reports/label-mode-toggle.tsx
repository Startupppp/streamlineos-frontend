"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { LabelMode } from "@/types/accounting/accounting-reports";

interface LabelModeToggleProps {
  value: LabelMode;
  onValueChange: (mode: LabelMode) => void;
  className?: string;
}

export function LabelModeToggle({
  value,
  onValueChange,
  className,
}: LabelModeToggleProps) {
  function handleChange(next: string) {
    onValueChange(next === "accountant" ? "accountant" : "founder");
  }

  return (
    <Tabs
      value={value}
      onValueChange={handleChange}
      className={cn("shrink-0", className)}
    >
      <TabsList aria-label="Wording">
        <TabsTrigger value="founder">Plain English</TabsTrigger>
        <TabsTrigger value="accountant">Accounting terms</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
