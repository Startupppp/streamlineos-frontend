"use client";

import { useState, useMemo, useCallback } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Send, CheckCircle2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { useDocumentTemplates } from "@/hooks/api/hr/document-templates";
import { useGenerateAndRollout } from "@/hooks/api/hr/recruitment";
import { extractVariables } from "@/lib/utils/document-variables";
import { getErrorMessage } from "@/lib/get-error-message";

export interface RolloutDocumentsDialogProps {
  candidateId: number;
  candidateName: string;
  jobTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const rolloutFormSchema = z.object({
  selectedTemplateIds: z
    .array(z.number())
    .min(1, "Select at least one template"),
  variables: z.record(z.string(), z.string()),
  sendEmail: z.boolean(),
});

type RolloutFormValues = z.infer<typeof rolloutFormSchema>;

interface TemplateCheckItemProps {
  id: number;
  title: string;
  type: string;
  checked: boolean;
  onToggle: (id: number, checked: boolean) => void;
}

function TemplateCheckItem({ id, title, type, checked, onToggle }: TemplateCheckItemProps) {
  function handleCheckedChange(v: boolean | "indeterminate") {
    onToggle(id, v === true);
  }
  return (
    <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors">
      <Checkbox
        checked={checked}
        onCheckedChange={handleCheckedChange}
        aria-label={`Select ${title}`}
      />
      <span className="flex-1 text-sm font-medium">{title}</span>
      <Badge variant="secondary" className="text-xs">{type}</Badge>
    </label>
  );
}

export function RolloutDocumentsDialog({
  candidateId,
  candidateName,
  jobTitle,
  open,
  onOpenChange,
}: RolloutDocumentsDialogProps) {
  const [succeeded, setSucceeded] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  const { data: templates, isLoading: templatesLoading } =
    useDocumentTemplates();
  const rollout = useGenerateAndRollout(candidateId);

  const form = useForm<RolloutFormValues>({
    resolver: zodResolver(rolloutFormSchema),
    defaultValues: {
      selectedTemplateIds: [],
      variables: {
        Candidate_Name: candidateName,
        Job_Title: jobTitle ?? "",
        Salary: "",
        Start_Date: "",
        Manager_Name: "",
      },
      sendEmail: true,
    },
  });

  const selectedIds = form.watch("selectedTemplateIds");

  const requiredVariables = useMemo(() => {
    if (!templates) return [] as string[];
    const selected = templates.filter((t) => selectedIds.includes(t.id));
    const allVars = selected.flatMap((t) => extractVariables(t.htmlContent));
    return [...new Set(allVars)];
  }, [templates, selectedIds]);

  const toggleTemplate = useCallback(
    (id: number, checked: boolean) => {
      const current = form.getValues("selectedTemplateIds");
      form.setValue(
        "selectedTemplateIds",
        checked ? [...current, id] : current.filter((x) => x !== id),
        { shouldValidate: true },
      );
    },
    [form],
  );

  const handleClose = useCallback(() => {
    form.reset();
    setSucceeded(false);
    setResultCount(0);
    onOpenChange(false);
  }, [form, onOpenChange]);

  const onSubmit = useCallback(
    async (values: RolloutFormValues) => {
      try {
        const result = await rollout.mutateAsync({
          templateIds: values.selectedTemplateIds,
          variables: values.variables,
          sendEmail: values.sendEmail,
        });
        setResultCount(result.count);
        setSucceeded(true);
        toast.success(
          `${result.count} document${result.count !== 1 ? "s" : ""} generated${values.sendEmail ? " and sent" : ""} successfully`,
        );
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
      }
    },
    [rollout],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            Generate Offer &amp; Documents
          </DialogTitle>
          <DialogDescription>
            Prepare and send offer documents for{" "}
            <span className="font-medium text-foreground">{candidateName}</span>
            {jobTitle ? ` — ${jobTitle}` : ""}
          </DialogDescription>
        </DialogHeader>

        {succeeded ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2
              className="h-12 w-12 text-green-500"
              aria-hidden="true"
            />
            <p className="text-lg font-semibold">
              {resultCount} document{resultCount !== 1 ? "s" : ""} generated
              successfully
            </p>
            <p className="text-sm text-muted-foreground">
              {form.getValues("sendEmail")
                ? "Documents have been emailed to the candidate."
                : "Documents are saved and ready to send."}
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium">Select Templates</p>
                {templatesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Loading templates…
                  </div>
                ) : !templates || templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No active document templates found. Create templates first.
                  </p>
                ) : (
                  <ScrollArea className="w-full" type="auto">
                    <div className="space-y-2 max-h-40 pr-1">
                      {templates.map((tpl) => (
                        <TemplateCheckItem
                          key={tpl.id}
                          id={tpl.id}
                          title={tpl.title}
                          type={tpl.type}
                          checked={selectedIds.includes(tpl.id)}
                          onToggle={toggleTemplate}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
                {form.formState.errors.selectedTemplateIds && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.selectedTemplateIds.message}
                  </p>
                )}
              </div>

              {requiredVariables.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Fill in Variables</p>
                    <ScrollArea className="w-full" type="auto">
                      <div className="space-y-3 max-h-56 pr-1">
                        {requiredVariables.map((varName) => (
                          <FormField
                            key={varName}
                            control={form.control}
                            name={`variables.${varName}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">
                                  {varName.replace(/_/g, " ")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder={`Enter ${varName.replace(/_/g, " ").toLowerCase()}`}
                                    className="text-sm"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}

              <Separator />

              <FormField
                control={form.control}
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Send email notification to candidate"
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        Email documents to candidate
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Candidate will receive an email with document links
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-row gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={rollout.isPending}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  className="flex-1"
                  isPending={rollout.isPending}
                  loadingText="Generating…"
                  disabled={rollout.isPending || selectedIds.length === 0}
                  aria-label="Generate and send documents"
                >
                  <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                  Generate &amp; Send
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
