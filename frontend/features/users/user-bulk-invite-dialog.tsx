"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useBulkInviteUsers } from "@/hooks/api/users";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

const bulkInviteSchema = z.object({
  emailsRaw: z
    .string()
    .min(1, "Enter at least one email address"),
  role: z.string().min(1, "Please select a role"),
});

type BulkInviteFormValues = z.infer<typeof bulkInviteSchema>;

interface BulkInviteResult {
  invited: number;
  failed: string[];
}

interface UserBulkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES = [
  { value: "MEMBER", label: "Member" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "HR", label: "HR" },
];

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export function UserBulkInviteDialog({ open, onOpenChange }: UserBulkInviteDialogProps) {
  const [result, setResult] = useState<BulkInviteResult | null>(null);
  const { mutate: bulkInvite, isPending } = useBulkInviteUsers();

  const form = useForm<BulkInviteFormValues>({
    resolver: zodResolver(bulkInviteSchema),
    defaultValues: { emailsRaw: "", role: "" },
  });

  const emailsRaw = form.watch("emailsRaw");
  const parsedEmails = useMemo(() => parseEmails(emailsRaw), [emailsRaw]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      form.reset();
      setResult(null);
    }
    onOpenChange(isOpen);
  }

  function onSubmit(values: BulkInviteFormValues) {
    const emails = parseEmails(values.emailsRaw);
    if (emails.length === 0) {
      form.setError("emailsRaw", { message: "Enter at least one email address" });
      return;
    }
    bulkInvite(
      { emails, role: values.role },
      {
        onSuccess: (data) => {
          const invited = data.results.filter((r) => r.success).length;
          const failed = data.results.filter((r) => !r.success).map((r) => r.email);
          setResult({ invited, failed });
          toast.success(`${invited} invitation(s) sent`);
        },
        onError: (error) => {
          toast.error(getApiError(error));
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Invite Users</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                {result.invited} invitation{result.invited !== 1 ? "s" : ""} sent successfully
              </p>
            </div>
            {result.failed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-medium text-red-700">
                    {result.failed.length} failed to send:
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.failed.map((email) => (
                    <Badge key={email} variant="outline" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-xs">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                form.reset();
                setResult(null);
              }}
            >
              Invite more
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="emailsRaw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email addresses
                      {parsedEmails.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          ({parsedEmails.length} detected)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="alice@company.com, bob@company.com&#10;one per line or comma-separated"
                        className="min-h-[120px] font-mono text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role for all invitees</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || parsedEmails.length === 0}>
                  {isPending
                    ? "Sending..."
                    : parsedEmails.length > 0
                    ? `Invite ${parsedEmails.length} user${parsedEmails.length !== 1 ? "s" : ""}`
                    : "Send invitations"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
