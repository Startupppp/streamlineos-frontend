"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeclineSignSession } from "@/hooks/api/sign/public";

const declineSchema = z.object({
  reason: z.string().min(1, "Please tell the sender why you're declining").max(2000),
});

type DeclineValues = z.infer<typeof declineSchema>;

export function DeclineDialog({ token, open, onOpenChange }: { token: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const decline = useDeclineSignSession(token);

  const form = useForm<DeclineValues>({
    resolver: zodResolver(declineSchema),
    defaultValues: { reason: "" },
  });

  async function handleConfirm(values: DeclineValues) {
    try {
      await decline.mutateAsync(values.reason.trim());
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
      <DialogContent className="gap-3 p-4 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Decline to sign</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-3">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Reason for declining" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                size="sm"
                variant="destructive"
                isPending={decline.isPending}
                loadingText="Declining…"
              >
                Decline
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
