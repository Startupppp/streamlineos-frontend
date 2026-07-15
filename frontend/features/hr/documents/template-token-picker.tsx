"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Separator } from "@/components/ui/separator";
import { Braces } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMON_TOKENS } from "./template-constants";

const TOKEN_COLORS: Record<string, "blue" | "emerald" | "violet"> = {
  Candidate_Name: "blue",
  Manager_Name: "blue",
  Reporting_To: "blue",
  Job_Title: "emerald",
  Salary: "emerald",
  Start_Date: "emerald",
  Probation_Period: "emerald",
  Department: "emerald",
  Company_Name: "violet",
  Location: "violet",
};

function getTokenColorClasses(token: string): string {
  const color = TOKEN_COLORS[token];
  switch (color) {
    case "blue":
      return "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700";
    case "emerald":
      return "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700";
    case "violet":
      return "bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700";
    default:
      return "bg-muted hover:bg-muted/80 text-foreground border-border dark:bg-slate-900/20 dark:hover:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700";
  }
}

interface TokenButtonProps {
  token: string;
  colorClasses: string;
  onInsert: (token: string) => void;
}

function TokenButton({ token, colorClasses, onInsert }: TokenButtonProps) {
  const handleClick = useCallback(() => onInsert(token), [token, onInsert]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-[11px] font-mono border transition-colors duration-200 cursor-pointer",
        colorClasses,
      )}
      title={`Insert {{${token}}}`}
    >
      {`{{${token}}}`}
    </button>
  );
}

interface TemplateTokenPickerProps {
  detectedVariables: string[];
  onInsertToken: (token: string) => void;
}

export function TemplateTokenPicker({
  detectedVariables,
  onInsertToken,
}: TemplateTokenPickerProps) {
  const [search, setSearch] = useState("");

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const filteredTokens = useMemo(
    () =>
      search
        ? COMMON_TOKENS.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
        : COMMON_TOKENS,
    [search],
  );

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b px-5 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <Braces className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">Variable Tokens</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Click a token to insert it at your cursor position.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="min-w-0">
          <SearchInput placeholder="Search tokens..." value={search} onValueChange={handleSearchChange} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filteredTokens.length > 0 ? (
            filteredTokens.map((token) => (
              <TokenButton
                key={token}
                token={token}
                colorClasses={getTokenColorClasses(token)}
                onInsert={onInsertToken}
              />
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground py-1">No tokens match your search.</p>
          )}
        </div>

        {detectedVariables.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Detected in content
              </p>
              <div className="flex flex-wrap gap-1">
                {detectedVariables.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/30"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
