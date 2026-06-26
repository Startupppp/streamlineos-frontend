"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

interface TemplateVersion {
  id: number;
  version: number;
  title: string;
  type: string;
  archivedAt?: string | null;
}

interface TemplateVersionHistoryProps {
  versions: TemplateVersion[];
}

export function TemplateVersionHistory({ versions }: TemplateVersionHistoryProps) {
  if (!versions.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Version History
        </CardTitle>
        <CardDescription>Previous saved versions of this template.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  v{v.version} — {v.title}
                </p>
                <p className="text-muted-foreground truncate">{v.type}</p>
              </div>
              <div className="ml-3 shrink-0 text-muted-foreground">
                {v.archivedAt ? new Date(v.archivedAt).toLocaleDateString() : "—"}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
