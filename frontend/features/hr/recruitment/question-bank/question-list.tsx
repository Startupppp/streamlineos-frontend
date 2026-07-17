"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Trash2, BookOpen, Pencil } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import type { InterviewQuestion } from "@/hooks/api/hr/recruitment";
import { TruncatedText } from "@/components/ui/truncated-text";
import { QuestionFormDialog } from "./question-form-dialog";

const DIFFICULTY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

interface QuestionListProps {
  questions: InterviewQuestion[] | undefined;
  isLoading: boolean;
  roleOptions: string[];
  onDeleteRequest: (id: number) => void;
}

export function QuestionList({
  questions,
  isLoading,
  roleOptions,
  onDeleteRequest,
}: QuestionListProps) {
  const columns = useMemo<DataTableColumn<InterviewQuestion>[]>(() => [
    {
      key: "question",
      header: "Question",
      className: "max-w-[400px]",
      cell: (q) => (
        <div>
          <TruncatedText text={q.question} lines={2} className="text-sm" />
          {q.keywords && q.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {q.keywords.slice(0, 3).map((kw) => (
                <Badge
                  key={kw}
                  variant="outline"
                  className="text-[10px] px-1 py-0 border-amber-400/60 text-amber-600"
                >
                  {kw}
                </Badge>
              ))}
              {q.keywords.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 border-amber-400/60 text-amber-600"
                >
                  +{q.keywords.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (q) => (
        <Badge variant="outline" className="text-xs">
          <BookOpen className="mr-1 h-3 w-3" />
          {q.category.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      cell: (q) => (
        <Badge
          variant={DIFFICULTY_VARIANT[q.difficulty] ?? "secondary"}
          className="text-xs"
        >
          {q.difficulty}
        </Badge>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (q) => (
        <span className="text-sm text-muted-foreground">{q.role ?? "—"}</span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      cell: (q) => (
        <div className="flex flex-wrap gap-1">
          {(q.tags ?? []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
              {tag}
            </Badge>
          ))}
          {(q.tags ?? []).length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              +{(q.tags ?? []).length - 3}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      cell: (q) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton icon={EllipsisIcon} iconSize={16} variant="ghost" size="icon" aria-label="Question actions" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <QuestionFormDialog mode="edit" question={q} roleOptions={roleOptions}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            </QuestionFormDialog>
            <DropdownMenuItem variant="destructive" onClick={() => onDeleteRequest(q.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [roleOptions, onDeleteRequest]);

  function getRowKey(q: InterviewQuestion) {
    return q.id;
  }

  return (
    <Card className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <CardContent className="flex flex-1 min-h-0 p-0">
        <DataTable
          data={questions ?? []}
          columns={columns}
          getRowKey={getRowKey}
          isLoading={isLoading}
          className="flex-1 min-h-0"
          emptyState={
            <RecruitmentEmptyState
              illustration={<EmptyDocumentsIllustration />}
              title="No questions yet"
              description="Add questions to build your bank."
            />
          }
        />
      </CardContent>
    </Card>
  );
}
