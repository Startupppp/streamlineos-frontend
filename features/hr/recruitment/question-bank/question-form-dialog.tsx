"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateInterviewQuestion,
  useUpdateInterviewQuestion,
  type InterviewQuestion,
} from "@/lib/api/hooks/hr/recruitment";

import { QuestionFormBody, CATEGORIES, DIFFICULTIES } from "./question-form-body";

export { CATEGORIES, DIFFICULTIES };

export interface QuestionFormState {
  question: string;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  role: string;
  roleInput: string;
  tags: string;
  sampleAnswer: string;
  keywords: string;
}

export const EMPTY_FORM: QuestionFormState = {
  question: "",
  category: "GENERAL",
  difficulty: "MEDIUM",
  role: "",
  roleInput: "",
  tags: "",
  sampleAnswer: "",
  keywords: "",
};

function validateForm(form: QuestionFormState): string | null {
  const trimmedQ = form.question.trim();
  if (!trimmedQ) return "Question text is required";
  if (trimmedQ.length < 10) return "Question must be at least 10 characters";
  if (trimmedQ.length > 1000) return "Question must be at most 1000 characters";
  return null;
}

function parseFormPayload(form: QuestionFormState) {
  const trimmedQ = form.question.trim();
  const rawTags = form.tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const rawKeywords = form.keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  return {
    question: trimmedQ,
    category: form.category,
    difficulty: form.difficulty,
    role: form.role.trim() || undefined,
    tags: [...new Set(rawTags)],
    sampleAnswer: form.sampleAnswer.trim() || undefined,
    keywords: [...new Set(rawKeywords)],
  };
}

interface CreateDialogProps {
  roleOptions: string[];
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: QuestionFormState;
  setForm: React.Dispatch<React.SetStateAction<QuestionFormState>>;
  onClose: () => void;
}

function CreateDialog({
  roleOptions,
  children,
  open,
  onOpenChange,
  form,
  setForm,
  onClose,
}: CreateDialogProps) {
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const createQuestion = useCreateInterviewQuestion();

  const handleCreate = useCallback(() => {
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    createQuestion.mutate(parseFormPayload(form), {
      onSuccess: () => {
        toast.success("Question added to bank");
        onClose();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [form, createQuestion, onClose]);

  const handleSheetOpenChange = useCallback(
    (v: boolean) => {
      if (!v) onClose();
      else onOpenChange(true);
    },
    [onClose, onOpenChange]
  );

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">Add Question</SheetTitle>
          <SheetDescription className="text-xs">
            Add a question to the interview bank.
          </SheetDescription>
        </SheetHeader>
        <QuestionFormBody
          form={form}
          setForm={setForm}
          roleOptions={roleOptions}
          rolePickerOpen={rolePickerOpen}
          onRolePickerOpenChange={setRolePickerOpen}
        />
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleCreate} disabled={createQuestion.isPending}>
            {createQuestion.isPending ? "Adding..." : "Add Question"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface EditDialogProps {
  question: InterviewQuestion;
  roleOptions: string[];
  children: React.ReactNode;
}

function EditDialog({ question, roleOptions, children }: EditDialogProps) {
  const [open, setOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [form, setForm] = useState<QuestionFormState>({
    question: question.question,
    category: question.category,
    difficulty: question.difficulty as "EASY" | "MEDIUM" | "HARD",
    role: question.role ?? "",
    roleInput: "",
    tags: (question.tags ?? []).join(", "),
    sampleAnswer: question.sampleAnswer ?? "",
    keywords: (question.keywords ?? []).join(", "),
  });

  const update = useUpdateInterviewQuestion(question.id);

  const handleSave = useCallback(() => {
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    update.mutate(parseFormPayload(form), {
      onSuccess: () => {
        toast.success("Question updated");
        setOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [form, update]);

  const handleOpenTrigger = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild onClick={handleOpenTrigger}>
        {children}
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base">Edit Question</SheetTitle>
          <SheetDescription className="text-xs">
            Update this question bank entry.
          </SheetDescription>
        </SheetHeader>
        <QuestionFormBody
          form={form}
          setForm={setForm}
          roleOptions={roleOptions}
          rolePickerOpen={rolePickerOpen}
          onRolePickerOpenChange={setRolePickerOpen}
        />
        <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type QuestionFormDialogProps =
  | {
      mode: "create";
      roleOptions: string[];
      children: React.ReactNode;
      open: boolean;
      onOpenChange: (v: boolean) => void;
      form: QuestionFormState;
      setForm: React.Dispatch<React.SetStateAction<QuestionFormState>>;
      onClose: () => void;
      question?: never;
    }
  | {
      mode: "edit";
      question: InterviewQuestion;
      roleOptions: string[];
      children: React.ReactNode;
      open?: never;
      onOpenChange?: never;
      form?: never;
      setForm?: never;
      onClose?: never;
    };

export function QuestionFormDialog(props: QuestionFormDialogProps) {
  if (props.mode === "edit") {
    return (
      <EditDialog question={props.question} roleOptions={props.roleOptions}>
        {props.children}
      </EditDialog>
    );
  }

  return (
    <CreateDialog
      roleOptions={props.roleOptions}
      open={props.open}
      onOpenChange={props.onOpenChange}
      form={props.form}
      setForm={props.setForm}
      onClose={props.onClose}
    >
      {props.children}
    </CreateDialog>
  );
}
