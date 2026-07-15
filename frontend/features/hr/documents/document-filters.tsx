"use client";

import { useCallback } from "react";
import { FileCheck, FileBadge, Shield, FileText, Building2, File } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
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

interface CategoryFilterButtonProps {
  category: string;
  isSelected: boolean;
  onCategoryChange: (value: string) => void;
}

function CategoryFilterButton({ category, isSelected, onCategoryChange }: CategoryFilterButtonProps) {
  const handleClick = useCallback(() => onCategoryChange(category), [onCategoryChange, category]);
  return (
    <button
      onClick={handleClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200 border",
        isSelected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground",
      )}
    >
      {category}
    </button>
  );
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
  const handleSearchChange = (value: string) => {
    onSearchChange(value);
  };

  return (
    <div className={cn("bg-muted/40 rounded-lg px-3 py-2", FILTER_TOOLBAR_ROW)}>
      <SearchInput
        placeholder="Search documents..."
        value={searchTerm}
        onValueChange={handleSearchChange}
        className="w-48"
        aria-label="Search documents"
      />

      <Select value={selectedType} onValueChange={onTypeChange}>
        <SelectTrigger className="text-xs w-36 border-border">
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
          <CategoryFilterButton
            key={cat}
            category={cat}
            isSelected={selectedCategory === cat}
            onCategoryChange={onCategoryChange}
          />
        ))}
      </div>
    </div>
  );
}
