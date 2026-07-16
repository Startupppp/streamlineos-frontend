"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

interface TemplateVersion {
  id: number;
  version: number;
  title: string;
  type: string;
  archivedAt?: string | null;
}

interface TemplateVersionHistoryProps {
  versions: TemplateVersion[];
  onRestore?: (version: TemplateVersion) => void;
}

interface VersionItemProps {
  version: TemplateVersion;
  isLatest: boolean;
  isLast: boolean;
  onRestore?: (version: TemplateVersion) => void;
}

function VersionItem({ version: v, isLatest, isLast, onRestore }: VersionItemProps) {
  const handleRestore = useCallback(() => {
    if (onRestore) onRestore(v);
  }, [v, onRestore]);

  return (
    <div className="relative pl-6">
      {!isLast && (
        <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
      )}
      <div
        className={cn(
          "absolute left-1 top-3.5 h-3.5 w-3.5 rounded-full border-2 border-background",
          isLatest ? "bg-emerald-500" : "bg-muted-foreground/30",
        )}
      />
      <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs hover:bg-muted/40 transition-colors duration-200 group">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <TruncatedText text={`v${v.version} — ${v.title}`} className="font-semibold text-foreground" />
            {isLatest && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 shrink-0">
                Latest
              </span>
            )}
          </div>
          <TruncatedText text={v.type} className="text-muted-foreground mt-0.5" />
        </div>
        <div className="ml-3 flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground">
            {v.archivedAt ? new Date(v.archivedAt).toLocaleDateString() : "—"}
          </span>
          {onRestore && !isLatest && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onClick={handleRestore}
              aria-label={`Restore version ${v.version}`}
              title={`Restore to v${v.version}`}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TemplateVersionHistory({ versions, onRestore }: TemplateVersionHistoryProps) {
  if (!versions.length) return null;

  const maxVersion = Math.max(...versions.map((v) => v.version));

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b px-5 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
            <History className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">Version History</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Previous saved versions of this template.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="max-h-[260px] overflow-y-auto pr-1">
          {versions.map((v, i) => (
            <VersionItem
              key={v.id}
              version={v}
              isLatest={v.version === maxVersion}
              isLast={i === versions.length - 1}
              onRestore={onRestore}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
