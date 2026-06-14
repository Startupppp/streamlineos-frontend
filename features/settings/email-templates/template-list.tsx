"use client";

import { Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, type EmailTemplateConfig } from "./template-registry";

export type { EmailTemplateConfig };
export { CATEGORIES };

interface TemplateListProps {
  activeCategory: string;
  selectedId: string;
  preview: { subject: string; html: string } | null;
  categoryTemplates: EmailTemplateConfig[];
  onCategoryChange: (cat: string) => void;
  onSelectId: (id: string) => void;
}

export function TemplateList({
  activeCategory,
  selectedId,
  preview,
  categoryTemplates,
  onCategoryChange,
  onSelectId,
}: TemplateListProps) {
  return (
    <div className="flex flex-col gap-4">
      <Tabs value={activeCategory} onValueChange={onCategoryChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedId} onValueChange={onSelectId}>
          <SelectTrigger className="w-72 h-8 text-sm" aria-label="Select template">
            <SelectValue placeholder="Select a template…" />
          </SelectTrigger>
          <SelectContent>
            {categoryTemplates.map((t) => (
              <SelectItem key={t.id} value={t.id} className="text-sm">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preview && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-foreground">Subject:</span>
            <span className="truncate max-w-[420px]">{preview.subject}</span>
          </div>
        )}
      </div>

      {preview ? (
        <Card className="shadow-noir overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b px-4 py-2.5 bg-muted/40 flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">Subject</Label>
              <span className="text-xs font-medium text-foreground truncate">
                {preview.subject}
              </span>
            </div>
            <div
              className="bg-white rounded-b-lg"
              style={{ minHeight: "500px" }}
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-noir">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Select a template to preview it here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
