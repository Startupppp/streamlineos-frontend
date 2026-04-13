"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useInterviewQuestions,
  useCreateInterviewQuestion,
  useDeleteInterviewQuestion,
} from "@/lib/api/hooks/hr/recruitment";
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
import { toast } from "sonner";
import { Plus, Search, MoreHorizontal, Trash2, BookOpen } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

const CATEGORIES = ["GENERAL", "TECHNICAL", "BEHAVIOURAL", "SITUATIONAL", "ROLE_SPECIFIC", "CULTURE_FIT"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

const DIFFICULTY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

function DeleteButton({ questionId }: { questionId: number }) {
  const del = useDeleteInterviewQuestion(questionId);
  return (
    <DropdownMenuItem
      onClick={() => del.mutate(undefined, {
        onSuccess: () => toast.success("Question deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      })}
      className="text-destructive"
      disabled={del.isPending}
    >
      <Trash2 className="mr-2 h-4 w-4" />Delete
    </DropdownMenuItem>
  );
}

export default function QuestionBankPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);

  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState("GENERAL");
  const [newDifficulty, setNewDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [newRole, setNewRole] = useState("");
  const [newTags, setNewTags] = useState("");

  const { data: questions, isLoading } = useInterviewQuestions({
    category: category !== "ALL" ? category : undefined,
    difficulty: difficulty !== "ALL" ? difficulty : undefined,
    q: search || undefined,
  });

  const createQuestion = useCreateInterviewQuestion();

  const handleCreate = useCallback(() => {
    if (!newQuestion.trim()) { toast.error("Question text is required"); return; }
    createQuestion.mutate(
      {
        question: newQuestion.trim(),
        category: newCategory,
        difficulty: newDifficulty,
        role: newRole.trim() || undefined,
        tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      },
      {
        onSuccess: () => {
          toast.success("Question added to bank");
          setSheetOpen(false);
          setNewQuestion(""); setNewRole(""); setNewTags("");
          setNewCategory("GENERAL"); setNewDifficulty("MEDIUM");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [newQuestion, newCategory, newDifficulty, newRole, newTags, createQuestion]);

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
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
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
                    <Select value={newDifficulty} onValueChange={(v) => setNewDifficulty(v as "EASY" | "MEDIUM" | "HARD")}>
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
                  <Input placeholder="e.g. Software Engineer, Sales Executive" value={newRole} onChange={(e) => setNewRole(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
                  <Input placeholder="e.g. leadership, problem-solving" value={newTags} onChange={(e) => setNewTags(e.target.value)} />
                </div>
              </div>
              <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
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
                  <TableRow key={q.id}>
                    <TableCell className="max-w-[400px]">
                      <p className="text-sm line-clamp-2">{q.question}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <BookOpen className="mr-1 h-3 w-3" />
                        {q.category.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={DIFFICULTY_VARIANT[q.difficulty] ?? "secondary"} className="text-xs">
                        {q.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{q.role ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(q.tags ?? []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">{tag}</Badge>
                        ))}
                        {(q.tags ?? []).length > 3 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">+{(q.tags ?? []).length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DeleteButton questionId={q.id} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
