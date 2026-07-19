"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useImportParticipants, type ParticipantImportRow } from "@/hooks/api/surveys/participants";

const schema = z.object({
  emails: z.string().min(1, "Enter at least one email address"),
});

type FormValues = z.infer<typeof schema>;

function parseEmails(raw: string): ParticipantImportRow[] {
  return raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

export function AddParticipantsDialog({ surveyId, open, onOpenChange }: { surveyId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const importParticipants = useImportParticipants(surveyId);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { emails: "" },
  });

  async function handleImport(values: FormValues) {
    const rows = parseEmails(values.emails);
    if (rows.length === 0) {
      form.setError("emails", { message: "Enter at least one email address" });
      return;
    }
    try {
      const created = await importParticipants.mutateAsync({ participants: rows });
      toast.success(`${created.length} participant${created.length === 1 ? "" : "s"} added`);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add participants</DialogTitle>
          <DialogDescription>Paste one email per line, or separate with commas.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleImport)} className="space-y-4">
            <FormField
              control={form.control}
              name="emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Emails <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      {...field}
                      placeholder={"jane@example.com\njohn@example.com"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={importParticipants.isPending} loadingText="Adding…">
                Add
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
