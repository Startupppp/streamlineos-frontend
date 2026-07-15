"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useCreateLegalHold, useAttachHoldItem, useDetachHoldItem, useHoldItems, type LegalHold } from "../hooks/use-legal-holds";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";
import { format } from "date-fns";

const placeHoldSchema = z.object({
  subjectUserId: z.string().min(1, "Subject user ID is required"),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(2000),
  restrictedExport: z.boolean(),
});

type PlaceHoldForm = z.infer<typeof placeHoldSchema>;

interface LegalHoldSheetProps {
  open: boolean;
  onClose: () => void;
  hold: LegalHold | null;
}

export function LegalHoldSheet({ open, onClose, hold }: LegalHoldSheetProps) {
  const [showAttach, setShowAttach] = useState(false);
  const [itemType, setItemType] = useState<"employee_profile" | "document" | "case_evidence">("employee_profile");
  const [itemRef, setItemRef] = useState("");

  const createHold = useCreateLegalHold();
  const attachItem = useAttachHoldItem();
  const detachItem = useDetachHoldItem();
  const { data: items, isLoading: itemsLoading } = useHoldItems(hold?.id);
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, {
        name: member.name,
        email: member.email,
      });
    }
    return map;
  }, [membersData]);

  function resolveMemberName(userId: string | null) {
    if (!userId) return "—";
    const member = memberById.get(userId);
    return member ? getUserDisplayName(member) : userId;
  }

  const form = useForm<PlaceHoldForm>({
    resolver: zodResolver(placeHoldSchema),
    defaultValues: { subjectUserId: "", reason: "", restrictedExport: true },
  });

  function handleCreate(values: PlaceHoldForm) {
    createHold.mutate(values, { onSuccess: () => { form.reset(); onClose(); } });
  }

  function handleAttach() {
    if (!hold || !itemRef.trim()) return;
    attachItem.mutate({ holdId: hold.id, itemType, itemRef: itemRef.trim() }, {
      onSuccess: () => { setItemRef(""); setShowAttach(false); },
    });
  }

  function handleDetach(itemId: number) {
    if (!hold) return;
    detachItem.mutate({ holdId: hold.id, itemId });
  }

  function handleToggleAttach() {
    setShowAttach((prev) => !prev);
  }

  if (hold) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <SheetTitle>Legal Hold #{hold.id}</SheetTitle>
            <SheetDescription>
              <Badge variant={hold.status === "active" ? "destructive" : "secondary"}>
                {hold.status}
              </Badge>
              {" "}Placed {format(new Date(hold.placedAt), "MMM d, yyyy")}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4 px-6 py-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</p>
              <p className="text-sm mt-1">{hold.reason}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</p>
              <p className="text-sm mt-1">{resolveMemberName(hold.subjectUserId)}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hold Items</p>
                {hold.status === "active" && (
                  <Button variant="outline" size="sm" onClick={handleToggleAttach}>
                    {showAttach ? "Cancel" : "Attach Item"}
                  </Button>
                )}
              </div>
              {showAttach && (
                <div className="border rounded-lg p-3 space-y-2 mb-3">
                  <div className="flex gap-2">
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value as typeof itemType)}
                      className="text-sm border rounded px-2 py-1 bg-background"
                    >
                      <option value="employee_profile">Employee Profile</option>
                      <option value="document">Document</option>
                      <option value="case_evidence">Case Evidence</option>
                    </select>
                    <Input
                      placeholder="Item reference (ID or URL)"
                      value={itemRef}
                      onChange={(e) => setItemRef(e.target.value)}
                      className="flex-1 text-sm"
                    />
                  </div>
                  <LoadingButton
                    size="sm"
                    isPending={attachItem.isPending}
                    onClick={handleAttach}
                    disabled={!itemRef.trim()}
                  >
                    Attach
                  </LoadingButton>
                </div>
              )}
              {itemsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full rounded" />)}
                </div>
              ) : (items ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No items attached to this hold.</p>
              ) : (
                <ul className="space-y-2">
                  {(items ?? []).map((item) => (
                    <li key={item.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                      <div>
                        <Badge variant="outline" className="text-xs mr-2">{item.itemType}</Badge>
                        <span className="font-mono text-xs">{item.itemRef}</span>
                      </div>
                      {hold.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-6 px-2 text-xs"
                          onClick={() => handleDetach(item.id)}
                          disabled={detachItem.isPending}
                        >
                          Remove
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>Place Legal Hold</SheetTitle>
          <SheetDescription>
            Prevent deletion or export of data for a subject under investigation.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCreate)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4 px-6 py-5">
            <FormField
              control={form.control}
              name="subjectUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <UserCombobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select employee"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the reason for this legal hold..." rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="restrictedExport"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Restrict data export for this subject</FormLabel>
                </FormItem>
              )}
            />
            </SheetBody>
            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <LoadingButton type="submit" isPending={createHold.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Place Hold
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
