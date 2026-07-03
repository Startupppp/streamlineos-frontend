"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, Trash2 } from "lucide-react";
import type { ProjectTemplate } from "@/hooks/api/projects";

interface TemplateCardProps {
  template: ProjectTemplate;
  onApply: (template: ProjectTemplate) => void;
  onDelete: (template: ProjectTemplate) => void;
}

export function TemplateCard({ template, onApply, onDelete }: TemplateCardProps) {
  const handleApply = useCallback(() => onApply(template), [onApply, template]);
  const handleDelete = useCallback(() => onDelete(template), [onDelete, template]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="secondary" className="text-[10px]">
              {template.category}
            </Badge>
            <Badge variant="outline">{template.tickets.length} tasks</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {template.tickets.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-[10px] shrink-0">
                {t.type}
              </Badge>
              <span className="flex-1 truncate text-sm">{t.title}</span>
              {t.phase && (
                <span className="text-[10px] bg-muted rounded px-1 text-muted-foreground shrink-0">
                  {t.phase}
                </span>
              )}
            </div>
          ))}
          {template.tickets.length > 4 && (
            <p className="text-xs text-muted-foreground">
              +{template.tickets.length - 4} more tasks
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 active:scale-[0.98]"
            onClick={handleApply}
          >
            <PlayCircle className="h-4 w-4 mr-1" /> Use Template
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive active:scale-[0.98]"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
