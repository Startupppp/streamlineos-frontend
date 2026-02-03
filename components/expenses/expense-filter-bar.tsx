"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Search,
  Filter,
  X,
  Calendar,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { ExpenseFilters, ExpenseCategory } from "@/server/actions/expense-query";
import { DatePreset } from "@/hooks/use-expense-filters";
import { cn } from "@/lib/utils";

interface ExpenseFilterBarProps {
  filters: ExpenseFilters;
  categories: ExpenseCategory[];
  onFilterChange: <K extends keyof ExpenseFilters>(
    key: K,
    value: ExpenseFilters[K]
  ) => void;
  onFiltersChange: (filters: Partial<ExpenseFilters>) => void;
  onReset: () => void;
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  onCustomDateRange: (startDate: string, endDate: string) => void;
  activeFilterCount: number;
  isAdmin: boolean;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAID", label: "Paid" },
];

const PAYMENT_METHODS = [
  { value: "all", label: "All Methods" },
  { value: "Cash", label: "Cash" },
  { value: "Company Card", label: "Company Card" },
  { value: "Personal Card", label: "Personal Card" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "Other", label: "Other" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

export function ExpenseFilterBar({
  filters,
  categories,
  onFilterChange,
  onFiltersChange,
  onReset,
  datePreset,
  onDatePresetChange,
  onCustomDateRange,
  activeFilterCount,
  isAdmin,
}: ExpenseFilterBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    filters.startDate ? new Date(filters.startDate) : undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    filters.endDate ? new Date(filters.endDate) : undefined
  );

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      onCustomDateRange(
        format(customStartDate, "yyyy-MM-dd"),
        format(customEndDate, "yyyy-MM-dd")
      );
    }
  };

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  return (
    <div className="space-y-3">
      {/* Main Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={filters.search || ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="pl-9"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => onFilterChange("search", "")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Date Preset */}
        <Select
          value={datePreset}
          onValueChange={(value) => onDatePresetChange(value as DatePreset)}
        >
          <SelectTrigger className="w-[160px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Popover */}
        {datePreset === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                {customStartDate && customEndDate
                  ? `${format(customStartDate, "MMM d")} - ${format(customEndDate, "MMM d")}`
                  : "Select dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                  />
                </div>
                <Separator />
                <div className="grid gap-2">
                  <Label>End Date</Label>
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCustomDateApply}
                  disabled={!customStartDate || !customEndDate}
                >
                  Apply Date Range
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Status Filter (Admin Only) */}
        {isAdmin && (
          <Select
            value={filters.status as string || "all"}
            onValueChange={(value) => onFilterChange("status", value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Category Filter */}
        <Select
          value={filters.category || ""}
          onValueChange={(value) => onFilterChange("category", value || undefined)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters Sheet */}
        <Sheet open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              More Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
              <SheetDescription>
                Apply additional filters to narrow down your expense search.
              </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={filters.paymentMethod || "all"}
                  onValueChange={(value) =>
                    onFilterChange("paymentMethod", value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <Label>Amount Range (INR)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minAmount || ""}
                    onChange={(e) =>
                      onFilterChange(
                        "minAmount",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxAmount || ""}
                    onChange={(e) =>
                      onFilterChange(
                        "maxAmount",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sortBy || "date"}
                    onValueChange={(value) =>
                      onFilterChange("sortBy", value as ExpenseFilters["sortBy"])
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sortOrder || "desc"}
                    onValueChange={(value) =>
                      onFilterChange("sortOrder", value as "asc" | "desc")
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest</SelectItem>
                      <SelectItem value="asc">Oldest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Page Size */}
              <div className="space-y-2">
                <Label>Results per page</Label>
                <Select
                  value={String(filters.pageSize || 50)}
                  onValueChange={(value) =>
                    onFilterChange("pageSize", parseInt(value, 10))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Page size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={onReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset All Filters
              </Button>
              <Button onClick={() => setIsAdvancedOpen(false)}>Apply</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Reset Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange("status", "all")}
              />
            </Badge>
          )}

          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              Category: {filters.category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange("category", undefined)}
              />
            </Badge>
          )}

          {(filters.startDate || filters.endDate) && (
            <Badge variant="secondary" className="gap-1">
              Date: {filters.startDate || "Start"} - {filters.endDate || "Present"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ startDate: undefined, endDate: undefined })
                }
              />
            </Badge>
          )}

          {filters.paymentMethod && filters.paymentMethod !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Payment: {filters.paymentMethod}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange("paymentMethod", undefined)}
              />
            </Badge>
          )}

          {(filters.minAmount || filters.maxAmount) && (
            <Badge variant="secondary" className="gap-1">
              Amount: {filters.minAmount || 0} - {filters.maxAmount || "∞"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ minAmount: undefined, maxAmount: undefined })
                }
              />
            </Badge>
          )}

          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.search}"
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange("search", "")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
