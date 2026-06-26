"use client";

import { Search, Filter, FileCheck, FileBadge, Shield, FileText, Building2, File } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const DOCUMENT_TYPES = [
  { value: "CONTRACT", label: "Contract", icon: FileCheck },
  { value: "CERTIFICATE", label: "Certificate", icon: FileBadge },
  { value: "ID_PROOF", label: "ID Proof", icon: Shield },
  { value: "PAYSLIP", label: "Payslip", icon: FileText },
  { value: "POLICY", label: "Policy", icon: Building2 },
  { value: "OFFER_LETTER", label: "Offer Letter", icon: FileText },
  { value: "RESUME", label: "Resume", icon: File },
  { value: "OTHER", label: "Other", icon: File },
];

export interface DocumentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categoryTabs: string[];
}

export function DocumentFilters({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  categoryTabs,
}: DocumentFiltersProps) {
  return (
    <Card className="shadow-sm border">
      <CardContent className="p-4 space-y-3">

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search by name, tag, or content..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 border-0 bg-muted/50 focus-visible:bg-background"
              aria-label="Search documents"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white dark:bg-background text-muted-foreground border-border hover:border-foreground/20 hover:bg-muted/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1 border-t">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" />
            Type:
          </span>
          <button
            onClick={() => onTypeChange("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              selectedType === "all"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            All
          </button>
          {DOCUMENT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => onTypeChange(type.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  selectedType === type.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-3 w-3" />
                {type.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
