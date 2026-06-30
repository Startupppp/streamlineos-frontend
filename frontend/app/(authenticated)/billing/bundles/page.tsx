"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface SolutionBundle {
  id: string;
  name: string;
  description: string;
  apps: string[];
  monthlyPrice: number;
  individualTotal: number;
  savings: number;
  color: string;
}

interface Module {
  id: string;
  name: string;
  price: number;
}

const SOLUTION_BUNDLES: SolutionBundle[] = [
  {
    id: "sales",
    name: "Sales Suite",
    description: "Everything your sales team needs to close deals",
    apps: ["CRM", "Calendar", "Chat", "AI Assistant"],
    monthlyPrice: 59900,
    individualTotal: 71880,
    savings: 15,
    color: "blue",
  },
  {
    id: "people",
    name: "People Suite",
    description: "Complete HR management for your team",
    apps: ["HRMS", "Leave Management", "Attendance", "Payroll"],
    monthlyPrice: 79900,
    individualTotal: 99875,
    savings: 20,
    color: "emerald",
  },
  {
    id: "operations",
    name: "Operations Suite",
    description: "Streamline your operations and supply chain",
    apps: ["Inventory", "Purchase Management", "Warehouse"],
    monthlyPrice: 49900,
    individualTotal: 58706,
    savings: 15,
    color: "amber",
  },
  {
    id: "finance",
    name: "Finance Suite",
    description: "Financial management and compliance",
    apps: ["Accounting", "Expenses", "Reports & Analytics"],
    monthlyPrice: 44900,
    individualTotal: 49888,
    savings: 10,
    color: "purple",
  },
];

const AVAILABLE_MODULES: Module[] = [
  { id: "crm", name: "CRM", price: 14900 },
  { id: "hrms", name: "HRMS", price: 19900 },
  { id: "payroll", name: "Payroll", price: 14900 },
  { id: "attendance", name: "Attendance", price: 7900 },
  { id: "inventory", name: "Inventory", price: 17900 },
  { id: "accounting", name: "Accounting", price: 17900 },
  { id: "projects", name: "Projects", price: 12900 },
  { id: "support", name: "Support", price: 9900 },
  { id: "chat", name: "Chat", price: 7900 },
  { id: "calendar", name: "Calendar", price: 6900 },
  { id: "ai", name: "AI Assistant", price: 9900 },
];

const BUNDLE_COLOR_STYLES: Record<
  string,
  { topBorder: string; saveBadge: string; button: string }
> = {
  blue: {
    topBorder: "border-t-blue-500",
    saveBadge:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    button: "bg-blue-600 hover:bg-blue-700 text-white border-0",
  },
  emerald: {
    topBorder: "border-t-emerald-500",
    saveBadge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white border-0",
  },
  amber: {
    topBorder: "border-t-amber-500",
    saveBadge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    button: "bg-amber-600 hover:bg-amber-700 text-white border-0",
  },
  purple: {
    topBorder: "border-t-purple-500",
    saveBadge:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
    button: "bg-purple-600 hover:bg-purple-700 text-white border-0",
  },
};

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function getCustomBundleDiscount(count: number): number {
  if (count >= 4) return 0.2;
  if (count >= 2) return 0.15;
  return 0;
}

export default function BundlesPage() {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const individualTotal = selectedModules.reduce((sum, id) => {
    const mod = AVAILABLE_MODULES.find((m) => m.id === id);
    return sum + (mod?.price ?? 0);
  }, 0);

  const discount = getCustomBundleDiscount(selectedModules.length);
  const bundlePrice = Math.round(individualTotal * (1 - discount));
  const savings = individualTotal - bundlePrice;

  function handleModuleToggle(id: string) {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  return (
    <PageWrapper
      title="Bundles & Suites"
      subtitle="Save up to 20% with bundled plans"
    >
      <div className="space-y-10">
        <section>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-foreground">
              Solution Suites
            </h2>
            <p className="text-sm text-muted-foreground">
              Curated bundles designed for common business needs
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SOLUTION_BUNDLES.map((bundle) => {
              const styles =
                BUNDLE_COLOR_STYLES[bundle.color] ?? BUNDLE_COLOR_STYLES.blue;
              return (
                <div
                  key={bundle.id}
                  className={cn(
                    "flex flex-col gap-4 rounded-lg border border-t-4 border-border bg-card p-5",
                    styles.topBorder,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {bundle.name}
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {bundle.description}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                        styles.saveBadge,
                      )}
                    >
                      Save {bundle.savings}%
                    </span>
                  </div>

                  <ul className="space-y-1.5">
                    {bundle.apps.map((app) => (
                      <li
                        key={app}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                        {app}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto border-t border-border pt-4">
                    <div className="mb-3 flex items-end gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {fmt(bundle.monthlyPrice)}
                      </span>
                      <span className="mb-0.5 text-sm text-muted-foreground">
                        /mo
                      </span>
                      <span className="mb-0.5 ml-1 text-sm text-muted-foreground line-through">
                        {fmt(bundle.individualTotal)}
                      </span>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className={cn("w-full", styles.button)}
                    >
                      <Link href="/billing/checkout">Get This Suite</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-foreground">
              Build Your Own Bundle
            </h2>
            <p className="text-sm text-muted-foreground">
              Select any combination of apps. We'll calculate the price and show
              your savings.
            </p>
          </div>

          <div className="space-y-5 rounded-lg border border-border bg-card p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {AVAILABLE_MODULES.map((mod) => {
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    htmlFor={`module-${mod.id}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md border p-3 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted/50",
                    )}
                  >
                    <Checkbox
                      id={`module-${mod.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleModuleToggle(mod.id)}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {mod.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(mod.price)}/mo
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedModules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 py-10 text-center">
                <Sparkles className="mx-auto mb-2.5 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Select modules to see pricing
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick 2 or more apps to unlock bundle savings
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-end gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {fmt(bundlePrice)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    </span>
                    {discount > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          {fmt(individualTotal)}/mo
                        </span>
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950/50 dark:text-green-300">
                          You save {fmt(savings)}/mo
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedModules.length} module
                    {selectedModules.length > 1 ? "s" : ""} selected
                    {discount > 0
                      ? ` · ${discount * 100}% bundle discount applied`
                      : " · Select 2+ for 15% off"}
                  </p>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link href="/billing/checkout">Proceed to Checkout</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
