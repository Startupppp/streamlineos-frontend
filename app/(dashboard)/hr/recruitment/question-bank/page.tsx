"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useInterviewQuestions,
  useCreateInterviewQuestion,
  useUpdateInterviewQuestion,
  useDeleteInterviewQuestion,
  type InterviewQuestion,
} from "@/lib/api/hooks/hr/recruitment";
import { useJobPostings } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { Plus, Search, MoreHorizontal, Trash2, BookOpen, Check, ChevronsUpDown, Pencil } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";

const CATEGORIES = ["GENERAL", "TECHNICAL", "BEHAVIOURAL", "SITUATIONAL", "ROLE_SPECIFIC", "CULTURE_FIT"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

const DIFFICULTY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

interface QuestionFormState {
  question: string;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  role: string;
  roleInput: string;
  tags: string;
  sampleAnswer: string;
  keywords: string;
}

const EMPTY_FORM: QuestionFormState = {
  question: "",
  category: "GENERAL",
  difficulty: "MEDIUM",
  role: "",
  roleInput: "",
  tags: "",
  sampleAnswer: "",
  keywords: "",
};

function RolePicker({
  value,
  roleInput,
  options,
  open,
  onOpenChange,
  onSelect,
  onInputChange,
  onUseCustom,
}: {
  value: string;
  roleInput: string;
  options: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (role: string) => void;
  onInputChange: (v: string) => void;
  onUseCustom: () => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {value || "Select or type a role..."}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or enter a role..."
            value={roleInput}
            onValueChange={onInputChange}
          />
          <CommandList>
            <CommandEmpty>
              {roleInput.trim() ? (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  onClick={onUseCustom}
                >
                  Use &quot;{roleInput.trim()}&quot;
                </button>
              ) : (
                <p className="py-2 text-center text-sm text-muted-foreground">No roles found. Type to add.</p>
              )}
            </CommandEmpty>
            {options.length > 0 && (
              <CommandGroup heading="Roles">
                {options.map((role) => (
                  <CommandItem
                    key={role}
                    value={role}
                    onSelect={() => onSelect(role)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === role ? "opacity-100" : "opacity-0")} />
                    {role}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function EditButton({ question, roleOptions }: { question: InterviewQuestion; roleOptions: string[] }) {
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
    const trimmedQ = form.question.trim();
    if (!trimmedQ) { toast.error("Question text is required"); return; }
    if (trimmedQ.length < 10) { toast.error("Question must be at least 10 characters"); return; }
    if (trimmedQ.length > 1000) { toast.error("Question must be at most 1000 characters"); return; }

    const rawTags = form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const rawKeywords = form.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);

    update.mutate(
      {
        question: trimmedQ,
        category: form.category,
        difficulty: form.difficulty,
        role: form.role.trim() || undefined,
        tags: rawTags,
        sampleAnswer: form.sampleAnswer.trim() || undefined,
        keywords: rawKeywords,
      },
      {
        onSuccess: () => {
          toast.success("Question updated");
          setOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [form, update]);

  const handleRoleSelect = useCallback((role: string) => {
    setForm((f) => ({ ...f, role, roleInput: "" }));
    setRolePickerOpen(false);
  }, []);

  const handleRoleInputChange = useCallback((v: string) => {
    setForm((f) => ({ ...f, roleInput: v }));
  }, []);

  const handleUseCustomRole = useCallback(() => {
    setForm((f) => ({ ...f, role: f.roleInput.trim(), roleInput: "" }));
    setRolePickerOpen(false);
  }, []);

  return (
    <>
      <DropdownMenuItem onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />Edit
      </DropdownMenuItem>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">Edit Question</SheetTitle>
            <SheetDescription className="text-xs">Update this question bank entry.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question</label>
              <Textarea
                placeholder="e.g. Tell me about a time you handled a conflict..."
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={form.difficulty} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v as "EASY" | "MEDIUM" | "HARD" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">For Role <span className="text-muted-foreground font-normal">(optional)</span></label>
              <RolePicker
                value={form.role}
                roleInput={form.roleInput}
                options={roleOptions}
                open={rolePickerOpen}
                onOpenChange={setRolePickerOpen}
                onSelect={handleRoleSelect}
                onInputChange={handleRoleInputChange}
                onUseCustom={handleUseCustomRole}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
              <Input
                placeholder="e.g. leadership, problem-solving"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sample Answer <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea
                placeholder="Describe what an ideal answer would include..."
                value={form.sampleAnswer}
                onChange={(e) => setForm((f) => ({ ...f, sampleAnswer: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Required Keywords <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
              <Input
                placeholder="e.g. ownership, collaboration, metrics"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function QuestionRow({
  question,
  roleOptions,
  onDeleteRequest,
}: {
  question: InterviewQuestion;
  roleOptions: string[];
  onDeleteRequest: (id: number) => void;
}) {
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
              <Badge key={kw} variant="outline" className="text-[10px] px-1 py-0 border-amber-400/60 text-amber-600">{kw}</Badge>
            ))}
            {question.keywords.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400/60 text-amber-600">+{question.keywords.length - 3}</Badge>
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
        <Badge variant={DIFFICULTY_VARIANT[question.difficulty] ?? "secondary"} className="text-xs">
          {question.difficulty}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{question.role ?? "—"}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {(question.tags ?? []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">{tag}</Badge>
          ))}
          {(question.tags ?? []).length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">+{(question.tags ?? []).length - 3}</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <EditButton question={question} roleOptions={roleOptions} />
            <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function QuestionBankPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const [form, setForm] = useState<QuestionFormState>(EMPTY_FORM);

  const { data: questions, isLoading } = useInterviewQuestions({
    category: category !== "ALL" ? category : undefined,
    difficulty: difficulty !== "ALL" ? difficulty : undefined,
    q: search || undefined,
  });

  const { data: jobPostings } = useJobPostings({ status: "OPEN" });

  const roleOptions = useMemo(() => {
    const fromQuestions = (questions ?? []).map((q) => q.role).filter((r): r is string => !!r);
    const fromJobs = (jobPostings ?? []).map((j) => j.title).filter(Boolean);
    return [...new Set([...fromQuestions, ...fromJobs])].sort();
  }, [questions, jobPostings]);

  const createQuestion = useCreateInterviewQuestion();
  const deleteQuestion = useDeleteInterviewQuestion(deleteTargetId ?? 0);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setForm(EMPTY_FORM);
  }, []);

  const handleCreate = useCallback(() => {
    const trimmedQ = form.question.trim();
    if (!trimmedQ) { toast.error("Question text is required"); return; }
    if (trimmedQ.length < 10) { toast.error("Question must be at least 10 characters"); return; }
    if (trimmedQ.length > 1000) { toast.error("Question must be at most 1000 characters"); return; }

    const rawTags = form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const uniqueTags = [...new Set(rawTags)];
    const rawKeywords = form.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    const uniqueKeywords = [...new Set(rawKeywords)];

    createQuestion.mutate(
      {
        question: trimmedQ,
        category: form.category,
        difficulty: form.difficulty,
        role: form.role.trim() || undefined,
        tags: uniqueTags,
        sampleAnswer: form.sampleAnswer.trim() || undefined,
        keywords: uniqueKeywords,
      },
      {
        onSuccess: () => {
          toast.success("Question added to bank");
          handleCloseSheet();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [form, createQuestion, handleCloseSheet]);

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

  const handleRoleSelect = useCallback((role: string) => {
    setForm((f) => ({ ...f, role, roleInput: "" }));
    setRolePickerOpen(false);
  }, []);

  const handleRoleInputChange = useCallback((v: string) => {
    setForm((f) => ({ ...f, roleInput: v }));
  }, []);

  const handleUseCustomRole = useCallback(() => {
    setForm((f) => ({ ...f, role: f.roleInput.trim(), roleInput: "" }));
    setRolePickerOpen(false);
  }, []);

  return (
    <PageWrapper
      title="Interview Question Bank"
      subtitle="Curated questions per role and round for interviewers"
      badge={`${questions?.length ?? 0} questions`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/recruitment">Back</Link>
          </Button>
          <Sheet open={sheetOpen} onOpenChange={(v) => { if (!v) handleCloseSheet(); else setSheetOpen(true); }}>
            <SheetTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Question</Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col p-0 gap-0">
              <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
                <SheetTitle className="text-base">Add Question</SheetTitle>
                <SheetDescription className="text-xs">Add a question to the interview bank.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Question</label>
                  <Textarea
                    placeholder="e.g. Tell me about a time you handled a conflict with a colleague..."
                    value={form.question}
                    onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty</label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v as "EASY" | "MEDIUM" | "HARD" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">For Role <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <RolePicker
                    value={form.role}
                    roleInput={form.roleInput}
                    options={roleOptions}
                    open={rolePickerOpen}
                    onOpenChange={setRolePickerOpen}
                    onSelect={handleRoleSelect}
                    onInputChange={handleRoleInputChange}
                    onUseCustom={handleUseCustomRole}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
                  <Input
                    placeholder="e.g. leadership, problem-solving"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sample Answer <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Textarea
                    placeholder="Describe what an ideal answer would include..."
                    value={form.sampleAnswer}
                    onChange={(e) => setForm((f) => ({ ...f, sampleAnswer: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Required Keywords <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
                  <Input
                    placeholder="e.g. ownership, collaboration, metrics"
                    value={form.keywords}
                    onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                  />
                </div>
              </div>
              <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCloseSheet}>Cancel</Button>
                <Button className="flex-1" onClick={handleCreate} disabled={createQuestion.isPending}>
                  {createQuestion.isPending ? "Adding..." : "Add Question"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      }
      filters={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 w-[200px] text-sm"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !questions?.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <EmptyDocumentsIllustration className="h-32 w-32 opacity-95" />
              <div>
                <p className="font-medium">No questions yet</p>
                <p className="text-sm text-muted-foreground">Add questions to build your bank.</p>
              </div>
            </div>
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
                    onDeleteRequest={handleDeleteRequest}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={deleteTargetId !== null}
        onOpenChange={handleDeleteCancel}
        title="Delete Question"
        description="Are you sure you want to delete this question from the bank? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isPending={deleteQuestion.isPending}
      />
    </PageWrapper>
  );
}
