"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Mail,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useEmailCampaigns, useCreateEmailCampaign, useSendEmailCampaign } from "@/lib/api/hooks/crm";
import type { EmailCampaign } from "@/lib/api/hooks/crm";
import { useToast } from "@/hooks/use-toast";

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
  const { data, isLoading } = useEmailCampaigns();
  const createCampaign = useCreateEmailCampaign();
  const sendCampaign = useSendEmailCampaign();
  const { toast } = useToast();

  const items: EmailCampaign[] = Array.isArray(data) ? data : [];

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createCampaign.mutate(
      {
        name: fd.get("name") as string,
        subject: fd.get("subject") as string,
        body: fd.get("body") as string,
      },
      {
        onSuccess: () => {
          toast({ title: "Email campaign created" });
          setSheetOpen(false);
        },
        onError: () => toast({ title: "Failed to create campaign", variant: "destructive" }),
      },
    );
  }

  function handleSend() {
    if (!sendId) return;
    sendCampaign.mutate(sendId, {
      onSuccess: (data) => {
        toast({ title: `Campaign sent to ${data?.sent ?? 0} recipients` });
        setSendId(null);
      },
      onError: () => toast({ title: "Failed to send campaign", variant: "destructive" }),
    });
  }

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
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No email campaigns yet.</TableCell>
                  </TableRow>
                ) : (
                  items.map((c) => {
                    const badge = STATUS_BADGE[c.status] ?? { label: c.status, variant: "secondary" as const };
                    const isDraft = c.status === "draft";
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{c.subject}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{c.recipientCount}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{c.sentCount}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{c.openCount}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{c.clickCount}</TableCell>
                        <TableCell className="text-right">
                          {isDraft && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setSendId(c.id)}
                            >
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Send
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Email Campaign</SheetTitle>
            <SheetDescription>Compose a new bulk email campaign.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input name="name" placeholder="e.g. April Newsletter" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input name="subject" placeholder="Subject line..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Email Body</Label>
              <Textarea name="body" placeholder="Write your email content..." rows={8} required />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createCampaign.isPending}>
                {createCampaign.isPending ? "Creating..." : "Create Draft"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={sendId !== null} onOpenChange={(open) => !open && setSendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Email Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the campaign to all matching recipients. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sendCampaign.isPending}>
              {sendCampaign.isPending ? "Sending..." : "Send Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
