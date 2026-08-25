"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BookOpen, Pencil } from "lucide-react";
import type { InterviewQuestion } from "@/hooks/api/hr/recruitment";

export const DIFFICULTY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

interface ViewFieldProps {
  label: string;
  children: React.ReactNode;
}

function ViewField({ label, children }: ViewFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

interface QuestionViewSheetProps {
  question: InterviewQuestion;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (question: InterviewQuestion) => void;
}

export function QuestionViewSheet({
  question,
  open,
  onOpenChange,
  onEdit,
}: QuestionViewSheetProps) {
  function handleEdit() {
    onEdit(question);
  }

  function handleClose() {
    onOpenChange(false);
  }

  const tags = question.tags ?? [];
  const keywords = question.keywords ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">Question Details</SheetTitle>
          <SheetDescription className="text-xs">
            Read-only view of this question bank entry.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-4 py-4 space-y-4">
          <ViewField label="Question">
            <p className="text-sm whitespace-pre-wrap">{question.question}</p>
          </ViewField>
          <div className="grid grid-cols-2 gap-4">
            <ViewField label="Category">
              <Badge variant="outline" className="text-xs">
                <BookOpen className="mr-1 h-3 w-3" />
                {question.category.replace("_", " ")}
              </Badge>
            </ViewField>
            <ViewField label="Difficulty">
              <Badge
                variant={DIFFICULTY_VARIANT[question.difficulty] ?? "secondary"}
                className="text-xs"
              >
                {question.difficulty}
              </Badge>
            </ViewField>
          </div>
          <ViewField label="For Role">
            <p className="text-sm">{question.role ?? "—"}</p>
          </ViewField>
          <ViewField label="Tags">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-micro px-1 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </ViewField>
          <ViewField label="Evaluation Keywords">
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {keywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="outline"
                    className="text-micro px-1 py-0 border-status-warning-rule text-status-warning-ink"
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </ViewField>
          <ViewField label="Sample Answer">
            {question.sampleAnswer ? (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {question.sampleAnswer}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </ViewField>
          {question.updatedAt && (
            <ViewField label="Last Updated">
              <p className="text-sm text-muted-foreground">
                {format(new Date(question.updatedAt), "MMM d, yyyy")}
              </p>
            </ViewField>
          )}
        </SheetBody>
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            Close
          </Button>
          <Button className="flex-1" onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
