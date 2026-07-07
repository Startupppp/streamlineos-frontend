"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Link as LinkIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useCreateTicketForm } from "./use-create-ticket-form";
import { CreateTicketAssignees } from "./create-ticket-assignees";
import { CreateTicketAttachments } from "./create-ticket-attachments";

const TiptapEditorDynamic = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[120px]" />
    ),
  },
);

interface CreateTicketDialogProps {
  projectId: number;
  variant?: "default" | "fab";
}

export function CreateTicketDialog({
  projectId,
  variant = "default",
}: CreateTicketDialogProps) {
  const {
    open,
    setOpen,
    form,
    files,
    selectedAssignees,
    isUploading,
    members,
    isPending,
    handleSubmit,
    handleAssigneeSelect,
    handleRemoveAssignee,
    handleRemoveFile,
    handleFileChange,
  } = useCreateTicketForm(projectId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {variant === "fab" ? (
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Create Ticket"
          >
            <Plus className="h-6 w-6" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Ticket
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-none lg:w-3/4 lg:max-w-[75vw] overflow-hidden p-0 flex flex-col"
      >
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>New Ticket</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E.g. Implement login page"
                        {...field}
                        className="text-base font-medium capitalize"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <TiptapEditorDynamic
                        content={field.value ?? ""}
                        onChangeHtml={(html) => field.onChange(html)}
                        output="html"
                        minHeightClassName="min-h-[120px]"
                        placeholder="Describe the ticket…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TASK">Task</SelectItem>
                            <SelectItem value="BUG">Bug</SelectItem>
                            <SelectItem value="STORY">Story</SelectItem>
                            <SelectItem value="EPIC">Epic</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem className="gap-1">
                <FormLabel>Assignees</FormLabel>
                <CreateTicketAssignees
                  members={members}
                  selectedAssignees={selectedAssignees}
                  onSelectAssignee={handleAssigneeSelect}
                  onRemoveAssignee={handleRemoveAssignee}
                />
                <FormMessage />
              </FormItem>

              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="https://..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem className="pt-2">
                <FormLabel>Attachments</FormLabel>
                <FormControl>
                  <CreateTicketAttachments
                    files={files}
                    onFileChange={handleFileChange}
                    onRemoveFile={handleRemoveFile}
                  />
                </FormControl>
              </FormItem>
            </form>
          </Form>
        </div>
        <div className="shrink-0 px-6 py-4 border-t">
          <Button
            type="button"
            disabled={isPending || isUploading}
            className="w-full"
            onClick={form.handleSubmit(handleSubmit)}
          >
            {isPending || isUploading ? "Creating..." : "Create Ticket"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
