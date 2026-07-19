"use client";

import { useState, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import {
  useInterviewQuestions,
  useDeleteInterviewQuestion,
  useJobPostings,
} from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";

import { QuestionList } from "@/features/hr/recruitment/question-bank/question-list";
import {
  QuestionFormDialog,
  EMPTY_FORM,
  CATEGORIES,
  DIFFICULTIES,
  type QuestionFormState,
} from "@/features/hr/recruitment/question-bank/question-form-dialog";

export default function QuestionBankPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [category, setCategory] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [form, setForm] = useState<QuestionFormState>(EMPTY_FORM);

  const {
    data: questions,
    isLoading,
    isError,
    refetch,
  } = useInterviewQuestions({
    category: category !== "ALL" ? category : undefined,
    difficulty: difficulty !== "ALL" ? difficulty : undefined,
    q: debouncedSearch.trim() || undefined,
  });

  const { data: jobPostings } = useJobPostings({ status: "OPEN" });

  const roleOptions = useMemo(() => {
    const fromQuestions = (questions ?? [])
      .map((q) => q.role)
      .filter((r): r is string => !!r);
    const fromJobs = (jobPostings ?? []).map((j) => j.title).filter(Boolean);
    return [...new Set([...fromQuestions, ...fromJobs])].sort();
  }, [questions, jobPostings]);

  const deleteQuestion = useDeleteInterviewQuestion(deleteTargetId ?? 0);

  const handleOpenCreateSheet = useCallback(() => setSheetOpen(true), []);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setForm(EMPTY_FORM);
  }, []);

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteQuestion.mutate(undefined, {
      onSuccess: () => {
        toast.success("Question deleted");
        setDeleteTargetId(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeleteTargetId(null);
      },
    });
  }, [deleteTargetId, deleteQuestion]);

  const handleDeleteCancel = useCallback((open: boolean) => {
    if (!open) setDeleteTargetId(null);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    },
    [],
  );

  return (
    <PageWrapper
      title="Interview Question Bank"
      subtitle="Curated questions per role and round for interviewers"

      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/recruitment">Back</Link>
          </Button>
          <QuestionFormDialog
            mode="create"
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            form={form}
            setForm={setForm}
            onClose={handleCloseSheet}
            roleOptions={roleOptions}
          >
            <Button size="sm" onClick={handleOpenCreateSheet}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </QuestionFormDialog>
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="min-w-0 w-[200px]">
            <SearchInput placeholder="Search questions..." value={search} onValueChange={handleSearchChange} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className={cn("w-[150px]", FILTER_SELECT_TRIGGER)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value="ALL">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className={cn("w-28", FILTER_SELECT_TRIGGER)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value="ALL">All Levels</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isError ? (
          <ErrorState description="Failed to load questions" onRetry={refetch} />
        ) : (
          <QuestionList
            questions={questions}
            isLoading={isLoading}
            roleOptions={roleOptions}
            onDeleteRequest={handleDeleteRequest}
          />
        )}
      </div>

      <ConfirmSheet
        open={deleteTargetId !== null}
        onOpenChange={handleDeleteCancel}
        title="Delete Question"
        description="Are you sure you want to delete this question from the bank? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        isPending={deleteQuestion.isPending}
      />
    </PageWrapper>
  );
}
