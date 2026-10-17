"use client";

import { useMemo, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RecruitmentEmptyState } from "@/features/recruitment/components/recruitment-empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Trash2, BookOpen, Pencil, Eye } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import type { InterviewQuestion } from "@/hooks/api/hr/recruitment";
import { TruncatedText } from "@/components/ui/truncated-text";
import { QuestionFormDialog } from "./question-form-dialog";
import { QuestionViewSheet, DIFFICULTY_VARIANT } from "./question-view-sheet";

function stopRowClick(e: React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation();
}

interface QuestionActionsCellProps {
  question: InterviewQuestion;
  onView: (q: InterviewQuestion) => void;
  onEdit: (q: InterviewQuestion) => void;
  onDelete: (id: number) => void;
}

function QuestionActionsCell({ question, onView, onEdit, onDelete }: QuestionActionsCellProps) {
  function handleViewClick() { onView(question); }
  function handleEditClick() { onEdit(question); }
  function handleDeleteClick() { onDelete(question.id); }
  return (
    <div onClick={stopRowClick} onKeyDown={stopRowClick}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton icon={EllipsisIcon} iconSize={16} variant="ghost" size="icon" aria-label="Question actions" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewClick}>
            <Eye className="mr-2 h-4 w-4" />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEditClick}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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
  const [editQuestion, setEditQuestion] = useState<InterviewQuestion | null>(null);
  const [viewQuestion, setViewQuestion] = useState<InterviewQuestion | null>(null);

  const handleEditRequest = useCallback((q: InterviewQuestion) => {
    setEditQuestion(q);
  }, []);

  const handleEditOpenChange = useCallback((v: boolean) => {
    if (!v) setEditQuestion(null);
  }, []);

  const handleViewRequest = useCallback((q: InterviewQuestion) => {
    setViewQuestion(q);
  }, []);

  const handleViewOpenChange = useCallback((v: boolean) => {
    if (!v) setViewQuestion(null);
  }, []);

  const handleEditFromView = useCallback((q: InterviewQuestion) => {
    setViewQuestion(null);
    setEditQuestion(q);
  }, []);

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
                  className="text-micro px-1 py-0 border-status-warning-rule text-status-warning-ink"
                >
                  {kw}
                </Badge>
              ))}
              {q.keywords.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-micro px-1 py-0 border-status-warning-rule text-status-warning-ink"
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
            <Badge key={tag} variant="secondary" className="text-micro px-1 py-0">
              {tag}
            </Badge>
          ))}
          {(q.tags ?? []).length > 3 && (
            <Badge variant="secondary" className="text-micro px-1 py-0">
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
        <QuestionActionsCell
          question={q}
          onView={handleViewRequest}
          onEdit={handleEditRequest}
          onDelete={onDeleteRequest}
        />
      ),
    },
  ], [handleViewRequest, handleEditRequest, onDeleteRequest]);

  function getRowKey(q: InterviewQuestion) {
    return q.id;
  }

  return (
    <>
      <Card className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <CardContent className="flex flex-1 min-h-0 p-0">
          <DataTable
            data={questions ?? []}
            columns={columns}
            getRowKey={getRowKey}
            onRowClick={handleViewRequest}
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

      {viewQuestion && (
        <QuestionViewSheet
          question={viewQuestion}
          open={viewQuestion !== null}
          onOpenChange={handleViewOpenChange}
          onEdit={handleEditFromView}
        />
      )}

      {editQuestion && (
        <QuestionFormDialog
          mode="edit"
          question={editQuestion}
          roleOptions={roleOptions}
          open={editQuestion !== null}
          onOpenChange={handleEditOpenChange}
        />
      )}
    </>
  );
}
