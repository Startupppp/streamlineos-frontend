"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { HrSheet } from "@/features/hr/hr-sheet";
import { useEmailCampaigns, useCreateEmailCampaign, useSendEmailCampaign } from "@/lib/api/hooks/crm";
import type { EmailCampaign } from "@/lib/api/hooks/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  scheduled: { label: "Scheduled", variant: "default" },
  sending: { label: "Sending", variant: "default" },
  sent: { label: "Sent", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

export default function EmailCampaignsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sendId, setSendId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data, isLoading } = useEmailCampaigns();
  const createCampaign = useCreateEmailCampaign();
  const sendCampaign = useSendEmailCampaign();

  const items: EmailCampaign[] = Array.isArray(data) ? data : [];

  const resetForm = useCallback(() => { setName(""); setSubject(""); setBody(""); }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error("Name, subject, and body are required");
      return;
    }
    createCampaign.mutate(
      { name: name.trim(), subject: subject.trim(), body: body.trim() },
      {
        onSuccess: () => { toast.success("Email campaign created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, subject, body, createCampaign, resetForm]);

  const handleSend = useCallback(() => {
    if (!sendId) return;
    sendCampaign.mutate(sendId, {
      onSuccess: (result) => { toast.success(`Campaign sent to ${result?.sent ?? 0} recipients`); setSendId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [sendId, sendCampaign]);

  return (
    <PageWrapper
      title="Email Campaigns"
      subtitle="Compose and send bulk emails"
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Campaign
        </Button>
      }
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Opens</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No email campaigns yet.</TableCell></TableRow>
                ) : items.map((c) => {
                  const badge = STATUS_BADGE[c.status] ?? { label: c.status, variant: "secondary" as const };
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.name}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{c.subject}</TableCell>
                      <TableCell><Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{c.recipientCount}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{c.sentCount}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{c.openCount}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{c.clickCount}</TableCell>
                      <TableCell className="text-right">
                        {c.status === "draft" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSendId(c.id)}>
                            <Send className="h-3.5 w-3.5 mr-1" />Send
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Email Campaign" description="Compose a new bulk email campaign." onSubmit={handleCreate} submitLabel="Create Draft" isPending={createCampaign.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Campaign Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. April Newsletter" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email Subject</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email Body</label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your email content..." rows={8} />
        </div>
      </HrSheet>

      <AlertDialog open={sendId !== null} onOpenChange={(open) => !open && setSendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Email Campaign?</AlertDialogTitle>
            <AlertDialogDescription>This will send the campaign to all matching recipients. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sendCampaign.isPending}>{sendCampaign.isPending ? "Sending..." : "Send Now"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
