"use client";

import { Search, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BUILT_IN_CATEGORY_TABS } from "@/lib/hr/document-library-constants";

export const DOCUMENT_TYPES = [
  { value: "CONTRACT", label: "Contract" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "ID_PROOF", label: "ID Proof" },
  { value: "PAYSLIP", label: "Payslip" },
  { value: "POLICY", label: "Policy" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "RESUME", label: "Resume" },
  { value: "OTHER", label: "Other" },
];

export interface DocumentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  customFolderNames: string[];
}

export function DocumentFilters({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  customFolderNames,
}: DocumentFiltersProps) {
  const folderOptions = [
    ...BUILT_IN_CATEGORY_TABS,
    ...customFolderNames.filter(
      (name) => !(BUILT_IN_CATEGORY_TABS as readonly string[]).includes(name),
    ),
  ];

  return (
    <Card className="shadow-sm border">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 w-full">
          <div className="relative flex-1 min-w-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search by name, tag, or content..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 border-0 bg-muted/50 focus-visible:bg-background w-full"
              aria-label="Search documents"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:shrink-0">
            <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[220px]">
              <label htmlFor="folder-filter" className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                Folder / view
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        <HelpCircle className="h-3.5 w-3.5" aria-label="Folder help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      Custom folders group files by category. Quick views (Contracts, Policies, etc.)
                      filter by document type.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Select value={selectedCategory} onValueChange={onCategoryChange}>
                <SelectTrigger id="folder-filter" className="h-9 flex-1">
                  <SelectValue placeholder="All Files" />
                </SelectTrigger>
                <SelectContent>
                  {folderOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 min-w-[180px] sm:min-w-[200px]">
              <label htmlFor="type-filter" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Document type
              </label>
              <Select value={selectedType} onValueChange={onTypeChange}>
                <SelectTrigger id="type-filter" className="h-9 flex-1">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
