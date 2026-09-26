"use client";

import { useHeadcountRequests } from "@/hooks/api/hr/headcount";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send } from "lucide-react";
import {
  useCreateJobRequisition,
  useSubmitRequisition,
} from "@/hooks/api/hr/requisitions";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { optionalNumericSelectChange } from "@/lib/numeric-field";
import { requisitionSchema, type RequisitionFormValues } from "./requisition-schema";

interface RequisitionFormSheetProps {
  open: boolean;
  onClose: () => void;
}

export function RequisitionFormSheet({ open, onClose }: RequisitionFormSheetProps) {
  const createRequisition = useCreateJobRequisition();
  const { data: headcounts } = useHeadcountRequests();
  const approvedHeadcounts = headcounts?.filter(h => h.status === "APPROVED") || [];
  const submitRequisition = useSubmitRequisition();

  const form = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      title: "",
      department: "",
      location: "",
      headcount: 1,
      budgetMin: "",
      budgetMax: "",
      priority: "MEDIUM",
      type: "FULL_TIME",
      justification: "",
      targetDate: "",
      headcountId: undefined,
    },
  });

  async function handleSaveDraft(values: RequisitionFormValues) {
    createRequisition.mutate(
      {
        title: values.title,
        department: values.department || undefined,
        location: values.location || undefined,
        headcount: values.headcount,
        budgetMin: values.budgetMin ? Number(values.budgetMin) : undefined,
        budgetMax: values.budgetMax ? Number(values.budgetMax) : undefined,
        priority: values.priority,
        type: values.type,
        justification: values.justification || undefined,
        targetDate: values.targetDate || undefined,
        headcountId: values.headcountId,
      },
      {
        onSuccess: () => {
          toast.success("Requisition saved as draft");
          form.reset();
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  async function handleSubmitForApproval(values: RequisitionFormValues) {
    createRequisition.mutate(
      {
        title: values.title,
        department: values.department || undefined,
        location: values.location || undefined,
        headcount: values.headcount,
        budgetMin: values.budgetMin ? Number(values.budgetMin) : undefined,
        budgetMax: values.budgetMax ? Number(values.budgetMax) : undefined,
        priority: values.priority,
        type: values.type,
        justification: values.justification || undefined,
        targetDate: values.targetDate || undefined,
        headcountId: values.headcountId,
      },
      {
        onSuccess: (created) => {
          submitRequisition.mutate(created.id, {
            onSuccess: () => {
              toast.success("Requisition submitted for approval");
              form.reset();
              onClose();
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          });
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleSheetOpenChange(v: boolean) {
    if (!v) onClose();
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>New Job Requisition</SheetTitle>
          <SheetDescription>Create a headcount request for approval</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <SheetBody className="px-6 py-5 space-y-4">
            <FormField
              control={form.control}
              name="headcountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to Headcount Request (Optional)</FormLabel>
                  <Select
                    onValueChange={optionalNumericSelectChange(field.onChange)}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an approved headcount..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {approvedHeadcounts.map((hc) => (
                        <SelectItem key={hc.id} value={hc.id.toString()}>
                          {hc.requestedRole} ({hc.targetDate ? hc.targetDate : "No date"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Senior Software Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Remote / City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="headcount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headcount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Budget</FormLabel>
                    <FormControl>
                      <Input placeholder="50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Budget</FormLabel>
                    <FormControl>
                      <Input placeholder="80000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Hire Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Justification</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why is this hire needed?"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SheetBody>
        </Form>

        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <LoadingButton
            variant="outline"
            onClick={form.handleSubmit(handleSaveDraft)}
            isPending={createRequisition.isPending && !submitRequisition.isPending}
            loadingText="Saving…"
            className="flex-1"
          >
            Save Draft
          </LoadingButton>
          <LoadingButton
            onClick={form.handleSubmit(handleSubmitForApproval)}
            isPending={submitRequisition.isPending || (createRequisition.isPending && submitRequisition.isPending)}
            loadingText="Submitting…"
            className="flex-1"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Submit for Approval
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
