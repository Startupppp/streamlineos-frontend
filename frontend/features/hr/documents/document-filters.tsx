"use client";

import { Search, FileCheck, FileBadge, Shield, FileText, Building2, File } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const DOCUMENT_TYPES = [
  { value: "CONTRACT",     label: "Contract",     icon: FileCheck  },
  { value: "CERTIFICATE",  label: "Certificate",  icon: FileBadge  },
  { value: "ID_PROOF",     label: "ID Proof",     icon: Shield     },
  { value: "PAYSLIP",      label: "Payslip",      icon: FileText   },
  { value: "POLICY",       label: "Policy",       icon: Building2  },
  { value: "OFFER_LETTER", label: "Offer Letter", icon: FileText   },
  { value: "RESUME",       label: "Resume",       icon: File       },
  { value: "OTHER",        label: "Other",        icon: File       },
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
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-8 h-8 text-xs w-48 border-border bg-background"
          aria-label="Search documents"
        />
      </div>

      <Select value={selectedType} onValueChange={onTypeChange}>
        <SelectTrigger className="h-8 text-xs w-36 border-border">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All types</SelectItem>
          {DOCUMENT_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value} className="text-xs">
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1 flex-wrap ml-1">
        {categoryTabs.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200 border",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
