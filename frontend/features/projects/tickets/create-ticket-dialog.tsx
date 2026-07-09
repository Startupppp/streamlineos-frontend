"use client";

import dynamic from "next/dynamic";
import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Paperclip, X, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/api";
import { useCreateTicketForm } from "./use-create-ticket-form";
import { TicketCreateProperties } from "./ticket-create-properties";

const TiptapEditorDynamic = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-md bg-muted min-h-[80px]" />
    ),
  },
);

interface CreateTicketDialogProps {
  projectId: number;
  defaultStatus?: string;
  variant?: "default" | "fab";
}

export function CreateTicketDialog({
  projectId,
  defaultStatus,
  variant = "default",
}: CreateTicketDialogProps) {
  const { data: project } = useProject(projectId);

  const {
    open,
    setOpen,
    form,
    files,
    isUploading,
    isPending,
    properties,
    handlePropertiesChange,
    handleSubmit,
    handleFileChange,
    handleRemoveFile,
    createMore,
    handleToggleCreateMore,
    titleRef,
    projectStatuses,
    members,
    labels,
    cycles,
  } = useCreateTicketForm({ projectId, defaultStatus });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenTrigger = useCallback(() => setOpen(true), [setOpen]);
  const handleOpenChange = useCallback((v: boolean) => setOpen(v), [setOpen]);
  const handleAttachClick = useCallback(() => fileInputRef.current?.click(), []);
  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      form.handleSubmit(handleSubmit)();
    },
    [form, handleSubmit],
  );

  return (
    <>
      {variant === "fab" ? (
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Create Issue"
          onClick={handleOpenTrigger}
        >
          <Plus className="h-6 w-6" />
        </Button>
      ) : (
        <Button onClick={handleOpenTrigger}>
          <Plus className="mr-2 h-4 w-4" />
          Create Issue
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              {project && (
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[10px] font-medium text-muted-foreground shrink-0"
                >
                  {project.key ?? project.name}
                </Badge>
              )}
              <DialogTitle className="text-sm font-medium text-muted-foreground">
                New Issue
              </DialogTitle>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="flex flex-col">
              <div className="px-5 pt-4 pb-2 space-y-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <input
                          {...field}
                          ref={(el) => {
                            field.ref(el);
                            (titleRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                          }}
                          autoFocus
                          placeholder="Issue title"
                          className="w-full bg-transparent text-lg font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none border-0 focus:ring-0 p-0 leading-tight"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <TiptapEditorDynamic
                          content={field.value ?? ""}
                          onChangeHtml={(html) => field.onChange(html)}
                          output="html"
                          minHeightClassName="min-h-[80px]"
                          placeholder="Add description…"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="px-5 py-3 border-t border-border/60">
                <TicketCreateProperties
                  value={properties}
                  onChange={handlePropertiesChange}
                  projectStatuses={projectStatuses}
                  members={members}
                  labels={labels}
                  cycles={cycles}
                />
              </div>

              {files.length > 0 && (
                <div className="px-5 pb-2 space-y-1.5">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                    >
                      <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-xs font-medium">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {(file.size / 1024).toFixed(0)}KB
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        aria-label="Remove file"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    aria-label="Attach file"
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={createMore}
                      onClick={handleToggleCreateMore}
                      className={cn(
                        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
                        createMore ? "bg-primary" : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform",
                          createMore ? "translate-x-3" : "translate-x-0",
                        )}
                      />
                    </button>
                    <span className="text-xs text-muted-foreground">Create more</span>
                  </label>

                  <Button
                    type="submit"
                    disabled={isPending || isUploading}
                    className="h-8 px-4 text-xs"
                    size="sm"
                  >
                    {isPending || isUploading ? "Creating…" : "Create issue"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
