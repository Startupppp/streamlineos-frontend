"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Braces } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHrTemplateVariables } from "@/hooks/api/hr/hr-templates";
import type { TemplateVariable } from "@/types/hr/templates";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => m.TiptapEditor),
  { ssr: false, loading: () => <div className="h-48 rounded-lg border bg-muted/30 animate-pulse" /> },
);

interface LetterEmailEditorProps {
  subject?: string;
  bodyHtml: string;
  showSubject?: boolean;
  onSubjectChange?: (value: string) => void;
  onBodyChange: (html: string) => void;
}

function VariableToken({ variable, onInsert }: { variable: TemplateVariable; onInsert: (token: string) => void }) {
  const handleClick = useCallback(() => onInsert(variable.token), [variable.token, onInsert]);
  return (
    <button
      type="button"
      onClick={handleClick}
      title={`${variable.label} — ${variable.example}`}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border transition-colors cursor-pointer",
        variable.sensitive
          ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-300 dark:border-red-500/30"
          : "bg-primary/5 hover:bg-primary/10 text-foreground border-primary/20",
      )}
    >
      {`{{${variable.token}}}`}
    </button>
  );
}

export function LetterEmailEditor({
  subject,
  bodyHtml,
  showSubject = true,
  onSubjectChange,
  onBodyChange,
}: LetterEmailEditorProps) {
  const [search, setSearch] = useState("");
  const { data: variables = [] } = useHrTemplateVariables();

  const grouped = useMemo(() => {
    const filtered = search
      ? variables.filter(
          (v) =>
            v.token.toLowerCase().includes(search.toLowerCase()) ||
            v.label.toLowerCase().includes(search.toLowerCase()),
        )
      : variables;

    return filtered.reduce<Record<string, TemplateVariable[]>>((acc, v) => {
      if (!acc[v.group]) acc[v.group] = [];
      acc[v.group].push(v);
      return acc;
    }, {});
  }, [variables, search]);

  const handleInsertToken = useCallback(
    (token: string) => {
      onBodyChange(bodyHtml + ` {{${token}}}`);
    },
    [bodyHtml, onBodyChange],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  return (
    <div className="space-y-4">
      {showSubject && onSubjectChange && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Subject</Label>
          <Input
            value={subject ?? ""}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Email / letter subject"
            className=""
          />
        </div>
      )}

      <Card className="rounded-xl border border-border overflow-hidden">
        <CardHeader className="pb-2 border-b px-4 pt-3">
          <div className="flex items-center gap-2">
            <Braces className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
            <CardTitle className="text-xs font-semibold">Variable Tokens</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <div className="min-w-0">
          <SearchInput placeholder="Search tokens..." value={search} onValueChange={handleSearchChange} />
        </div>
          <div className="max-h-32 overflow-y-auto space-y-1.5">
            {Object.entries(grouped).map(([group, vars]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{group}</p>
                <div className="flex flex-wrap gap-1">
                  {vars.map((v) => (
                    <VariableToken key={v.token} variable={v} onInsert={handleInsertToken} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1">
        <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Body</Label>
        <TiptapEditor
          content={bodyHtml}
          onChangeHtml={onBodyChange}
          output="html"
          placeholder="Write your letter or email body here. Use the variable tokens above to insert dynamic values."
          minHeightClassName="min-h-[300px]"
        />
      </div>
    </div>
  );
}
