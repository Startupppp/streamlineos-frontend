"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { FileText, StickyNote, Lock, Loader2, Plus } from "lucide-react";
import {
  useHrCase,
  useCaseNotes,
  useCaseDocuments,
  useAddCaseNote,
  useStartInvestigation,
  useUpdateCase,
} from "@/hooks/api/hr/cases";
import { CaseStatusBadge, CaseSeverityBadge, CaseCategoryLabel } from "./case-badges";
import { formatDistanceToNow } from "date-fns";

interface Props {
  caseId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function NoteThread({ caseId }: { caseId: number }) {
  const { data: notes, isLoading } = useCaseNotes(caseId);
  const addNote = useAddCaseNote(caseId);
  const [text, setText] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);

  function handleAdd() {
    if (!text.trim()) return;
    addNote.mutate({ note: text.trim(), isConfidential }, { onSuccess: () => setText("") });
  }

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin mx-auto mt-4" />;

  return (
    <div className="space-y-3">
      {notes?.map((note) => (
        <div
          key={note.id}
          className={cn(
            "rounded-lg border p-3 text-sm",
            note.isConfidential ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10" : "bg-muted/30",
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
            </span>
            {note.isConfidential && (
              <Badge variant="outline" className="text-amber-700 border-amber-200 text-xs gap-1 dark:text-amber-300 dark:border-amber-500/30">
                <Lock className="h-3 w-3" />
                Confidential
              </Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.note}</p>
        </div>
      ))}

      <div className="space-y-2 pt-2">
        <Textarea
          rows={3}
          placeholder="Add a note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="text-sm"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={isConfidential} onCheckedChange={setIsConfidential} className="scale-75" />
            <span>Confidential</span>
          </div>
          <LoadingButton
            size="sm"
            isPending={addNote.isPending}
            onClick={handleAdd}
            disabled={!text.trim()}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Note
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

function DocumentsList({ caseId }: { caseId: number }) {
  const { data: docs, isLoading } = useCaseDocuments(caseId);

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin mx-auto mt-4" />;
  if (!docs?.length) return <p className="text-xs text-muted-foreground">No documents attached</p>;

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <a
          key={doc.id}
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md border p-2.5 text-sm hover:bg-muted/50 transition-colors"
        >
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 truncate">{doc.name}</span>
          {doc.restricted && (
            <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
        </a>
      ))}
    </div>
  );
}

export function CaseDetailSheet({ caseId, open, onOpenChange }: Props) {
  const { data: hrCase, isLoading } = useHrCase(caseId);
  const startInvestigation = useStartInvestigation(caseId);
  const updateCase = useUpdateCase(caseId);
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "documents">("details");

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 gap-0 sm:max-w-xl w-full">
        <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b">
          {isLoading ? (
            <SheetTitle>Loading...</SheetTitle>
          ) : hrCase ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-base font-semibold font-mono">
                  {hrCase.caseNumber}
                </SheetTitle>
                <CaseStatusBadge status={hrCase.status} />
                <CaseSeverityBadge severity={hrCase.severity} />
                {hrCase.anonymous && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Anonymous</Badge>
                )}
              </div>
              <SheetDescription className="text-sm text-foreground mt-1 font-medium">
                {hrCase.summary}
              </SheetDescription>
              <p className="text-xs text-muted-foreground">
                <CaseCategoryLabel category={hrCase.category} />
                {" · "}
                {formatDistanceToNow(new Date(hrCase.createdAt), { addSuffix: true })}
              </p>
            </>
          ) : null}
        </SheetHeader>

        {hrCase && (
          <>
            <div className="flex items-center gap-1 px-5 pt-3 shrink-0 border-b pb-0">
              {(["details", "notes", "documents"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === "notes" && <StickyNote className="h-3 w-3 inline mr-1" />}
                  {tab === "documents" && <FileText className="h-3 w-3 inline mr-1" />}
                  {tab}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-5 py-4 space-y-4">
                {activeTab === "details" && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Details
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{hrCase.details}</p>
                    </div>

                    {hrCase.outcome && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Outcome
                          </p>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{hrCase.outcome}</p>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex flex-wrap gap-3">
                      {hrCase.status === "open" && (
                        <LoadingButton
                          size="sm"
                          variant="outline"
                          isPending={startInvestigation.isPending}
                          onClick={() => startInvestigation.mutate()}
                        >
                          Start Investigation
                        </LoadingButton>
                      )}
                      {hrCase.status === "under_investigation" && (
                        <LoadingButton
                          size="sm"
                          variant="outline"
                          isPending={updateCase.isPending}
                          onClick={() => updateCase.mutate({ status: "resolved" })}
                        >
                          Mark Resolved
                        </LoadingButton>
                      )}
                    </div>
                  </>
                )}

                {activeTab === "notes" && <NoteThread caseId={caseId} />}
                {activeTab === "documents" && <DocumentsList caseId={caseId} />}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
