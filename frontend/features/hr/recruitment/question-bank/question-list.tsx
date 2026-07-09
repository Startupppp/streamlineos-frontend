"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Trash2, BookOpen, Pencil } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import type { InterviewQuestion } from "@/hooks/api/hr/recruitment";
import { QuestionFormDialog } from "./question-form-dialog";

const DIFFICULTY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

interface QuestionRowProps {
  question: InterviewQuestion;
  roleOptions: string[];
  onDeleteRequest: (id: number) => void;
}

function QuestionRow({ question, roleOptions, onDeleteRequest }: QuestionRowProps) {
  const handleDeleteClick = useCallback(() => {
    onDeleteRequest(question.id);
  }, [question.id, onDeleteRequest]);

  return (
    <TableRow>
      <TableCell className="max-w-[400px]">
        <p className="text-sm line-clamp-2">{question.question}</p>
        {question.keywords && question.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {question.keywords.slice(0, 3).map((kw) => (
              <Badge
                key={kw}
                variant="outline"
                className="text-[10px] px-1 py-0 border-amber-400/60 text-amber-600"
              >
                {kw}
              </Badge>
            ))}
            {question.keywords.length > 3 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 border-amber-400/60 text-amber-600"
              >
                +{question.keywords.length - 3}
              </Badge>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          <BookOpen className="mr-1 h-3 w-3" />
          {question.category.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant={DIFFICULTY_VARIANT[question.difficulty] ?? "secondary"}
          className="text-xs"
        >
          {question.difficulty}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{question.role ?? "—"}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {(question.tags ?? []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
              {tag}
            </Badge>
          ))}
          {(question.tags ?? []).length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              +{(question.tags ?? []).length - 3}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <QuestionFormDialog mode="edit" question={question} roleOptions={roleOptions}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            </QuestionFormDialog>
            <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
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
  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingState variant="table" rows={6} />
        ) : !questions?.length ? (
          <RecruitmentEmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No questions yet"
            description="Add questions to build your bank."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  roleOptions={roleOptions}
                  onDeleteRequest={onDeleteRequest}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
