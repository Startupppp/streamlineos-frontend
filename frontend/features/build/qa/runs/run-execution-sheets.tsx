"use client";

import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TestRunResult } from "@/types/projects";
import type { CreateBugFromResultFormValues } from "./run-schema";

interface NotesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notesResult: TestRunResult | null;
  notesValue: string;
  onNotesChange: (value: string) => void;
  canExecute: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function NotesSheet({
  open,
  onOpenChange,
  notesResult,
  notesValue,
  onNotesChange,
  canExecute,
  isSaving,
  onSave,
}: NotesSheetProps) {
  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onNotesChange(e.target.value);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle>
            {notesResult?.testCase
              ? `Notes for TC-${notesResult.testCase.caseNumber}`
              : "Execution Notes"}
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col p-5">
          <Textarea
            value={notesValue}
            onChange={handleTextareaChange}
            placeholder="Add execution notes…"
            className="min-h-[120px] resize-none text-dense"
            disabled={!canExecute}
          />
        </div>
        <SheetFooter className="flex shrink-0 gap-2 border-t px-5 py-3">
          <SheetClose asChild>
            <Button type="button" variant="outline" size="sm" className="text-dense">
              Cancel
            </Button>
          </SheetClose>
          {canExecute ? (
            <LoadingButton
              type="button"
              size="sm"
              className="text-dense"
              isPending={isSaving}
              loadingText="Saving…"
              onClick={onSave}
            >
              Save
            </LoadingButton>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface CreateBugSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<CreateBugFromResultFormValues>;
  onSubmit: (values: CreateBugFromResultFormValues) => void;
  isPending: boolean;
}

export function CreateBugSheet({
  open,
  onOpenChange,
  form,
  onSubmit,
  isPending,
}: CreateBugSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <SheetTitle>Create Bug from Result</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-4 px-5 py-4">
                <FormField
                  control={form.control}
                  name="bugTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Title <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} className="text-dense" placeholder="Bug title" />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bugSeverity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Severity</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="blocker">Blocker</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="major">Major</SelectItem>
                          <SelectItem value="minor">Minor</SelectItem>
                          <SelectItem value="trivial">Trivial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <SheetFooter className="flex shrink-0 gap-2 border-t px-5 py-3">
              <SheetClose asChild>
                <Button type="button" variant="outline" size="sm" className="text-dense">Cancel</Button>
              </SheetClose>
              <LoadingButton
                type="submit"
                size="sm"
                className="text-dense"
                isPending={isPending}
                loadingText="Creating…"
              >
                Create Bug
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
