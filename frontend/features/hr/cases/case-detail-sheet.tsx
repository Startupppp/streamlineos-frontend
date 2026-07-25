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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FileText, StickyNote, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon } from "@animateicons/react/lucide";
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

function AddNoteButton({ isPending, disabled, onClick }: { isPending: boolean; disabled: boolean; onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      isPending={isPending}
      onClick={onClick}
      disabled={disabled}
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={12} className="mr-1" />
      Add Note
    </LoadingButton>
  );
}

function NoteThread({ caseId }: { caseId: number }) {
  const { data: notes, isLoading } = useCaseNotes(caseId);
  const addNote = useAddCaseNote(caseId);
  const [text, setText] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);

  function handleAdd() {
    if (!text.trim()) return;
    addNote.mutate({ note: text.trim(), isConfidential }, {
      onSuccess: () => setText(""),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
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
          <AddNoteButton
            isPending={addNote.isPending}
            onClick={handleAdd}
            disabled={!text.trim()}
          />
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
            <Lock className="h-3 w-3 text-amber-600 dark:text-amber-300 shrink-0" />
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

  function handleStartInvestigation() {
    startInvestigation.mutate(undefined, {
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleMarkResolved() {
    updateCase.mutate({ status: "resolved" }, {
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

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
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "details" | "notes" | "documents")}
            className="flex flex-1 min-h-0 flex-col"
          >
            <TabsList className="mx-5 mt-3 w-fit shrink-0">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">
                <StickyNote className="h-3 w-3" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-3 w-3" />
                Documents
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-5 py-4">
                <TabsContent value="details" className={cn(TABS_CONTENT_PAGE_BODY_CLASS, "space-y-4")}>
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
                        onClick={handleStartInvestigation}
                      >
                        Start Investigation
                      </LoadingButton>
                    )}
                    {hrCase.status === "under_investigation" && (
                      <LoadingButton
                        size="sm"
                        variant="outline"
                        isPending={updateCase.isPending}
                        onClick={handleMarkResolved}
                      >
                        Mark Resolved
                      </LoadingButton>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className={TABS_CONTENT_PAGE_BODY_CLASS}>
                  <NoteThread caseId={caseId} />
                </TabsContent>
                <TabsContent value="documents" className={TABS_CONTENT_PAGE_BODY_CLASS}>
                  <DocumentsList caseId={caseId} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
