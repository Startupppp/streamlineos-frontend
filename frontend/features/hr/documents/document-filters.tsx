"use client";

import { FileCheck, FileBadge, Shield, FileText, Building2, File } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterPill, FilterPillGroup } from "@/components/ui/filter-pill";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
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
  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search documents..."
        value={searchTerm}
        onValueChange={onSearchChange}
        className="w-48"
        aria-label="Search documents"
      />

      <Select value={selectedType} onValueChange={onTypeChange}>
        <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
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

      <FilterPillGroup className="ml-1">
        {categoryTabs.map((cat) => (
          <FilterPill
            key={cat}
            active={selectedCategory === cat}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </FilterPill>
        ))}
      </FilterPillGroup>
    </div>
  );
}
