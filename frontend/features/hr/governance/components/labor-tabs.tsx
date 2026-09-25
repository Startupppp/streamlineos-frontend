"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCursorPager } from "@/components/ui/table-pagination";
import { format } from "date-fns";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
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
import { UserCombobox } from "@/components/ui/user-combobox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { StateIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import {
  useUnionMemberships,
  useCollectiveAgreements,
  useLaborCases,
  useExpiringAgreements,
  useCreateUnionMembership,
  useCreateCollectiveAgreement,
  useCreateLaborCase,
  useDeleteUnionMembership,
  useDeleteCollectiveAgreement,
  useDeleteLaborCase,
  type UnionMembership,
  type CollectiveAgreement,
  type LaborCase,
} from "../hooks/use-labor";

const ACTIVE_TABS = ["memberships", "agreements", "cases"] as const;
type ActiveTab = (typeof ACTIVE_TABS)[number];

const membershipSchema = z.object({
  userId: z.string().min(1),
  unionName: z.string().min(1).max(300),
  memberSince: z.string().min(1),
  status: z.enum(["active", "inactive"]),
});

const agreementSchema = z.object({
  unionName: z.string().min(1).max(300),
  title: z.string().min(1).max(500),
  effectiveFrom: z.string().min(1),
  expiresAt: z.string(),
  status: z.enum(["active", "expired", "negotiating"]),
});

const caseSchema = z.object({
  unionName: z.string().min(1).max(300),
  subject: z.string().min(1).max(500),
  description: z.string().min(1).max(10000),
});

export function LaborTabs() {
  const canManage = useCan("hr:labor:manage");
  const [activeTab, setActiveTab] = useState<ActiveTab>("memberships");
  const [sheetOpen, setSheetOpen] = useState(false);
  // All three endpoints are keyset-paginated; the `page` sent before was
  // ignored, so rows past the first 20 were unreachable.
  const membershipPager = useCursorPager();
  const agreementPager = useCursorPager();
  const casePager = useCursorPager();
  const [pendingDelete, setPendingDelete] = useState<{ kind: ActiveTab; id: number; label: string } | null>(null);

  const { data: memberships, isLoading: membershipsLoading, isError: membershipsIsError, error: membershipsError, refetch: refetchMemberships } = useUnionMemberships({ cursor: membershipPager.cursor, limit: 20 });
  const { data: agreements, isLoading: agreementsLoading, isError: agreementsIsError, error: agreementsError, refetch: refetchAgreements } = useCollectiveAgreements({ cursor: agreementPager.cursor, limit: 20 });
  const { data: cases, isLoading: casesLoading, isError: casesIsError, error: casesError, refetch: refetchCases } = useLaborCases({ cursor: casePager.cursor, limit: 20 });
  const { data: expiring } = useExpiringAgreements(30);

  const memberUserIds = useMemo(
    () => [...new Set((memberships?.data ?? []).map((m) => m.userId))],
    [memberships?.data],
  );
  const { data: membersData } = useOrgMembersByIds(memberUserIds);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const createMembership = useCreateUnionMembership();
  const createAgreement = useCreateCollectiveAgreement();
  const createCase = useCreateLaborCase();
  const deleteMembership = useDeleteUnionMembership();
  const deleteAgreement = useDeleteCollectiveAgreement();
  const deleteCase = useDeleteLaborCase();

  const membershipForm = useForm<z.infer<typeof membershipSchema>>({
    resolver: zodResolver(membershipSchema),
    defaultValues: { userId: "", unionName: "", memberSince: "", status: "active" },
  });

  const agreementForm = useForm<z.infer<typeof agreementSchema>>({
    resolver: zodResolver(agreementSchema),
    defaultValues: { unionName: "", title: "", effectiveFrom: "", expiresAt: "", status: "active" },
  });

  const caseForm = useForm<z.infer<typeof caseSchema>>({
    resolver: zodResolver(caseSchema),
    defaultValues: { unionName: "", subject: "", description: "" },
  });

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  function handleRetry() {
    if (activeTab === "memberships") { void refetchMemberships(); return; }
    if (activeTab === "agreements") { void refetchAgreements(); return; }
    void refetchCases();
  }

  function handleCreateMembership(values: z.infer<typeof membershipSchema>) {
    createMembership.mutate(values, { onSuccess: () => { membershipForm.reset(); setSheetOpen(false); } });
  }

  function handleCreateAgreement(values: z.infer<typeof agreementSchema>) {
    createAgreement.mutate(
      { ...values, expiresAt: values.expiresAt || undefined },
      { onSuccess: () => { agreementForm.reset(); setSheetOpen(false); } },
    );
  }

  function handleCreateCase(values: z.infer<typeof caseSchema>) {
    createCase.mutate(values, { onSuccess: () => { caseForm.reset(); setSheetOpen(false); } });
  }

  const deleteMutation =
    pendingDelete?.kind === "agreements" ? deleteAgreement : pendingDelete?.kind === "cases" ? deleteCase : deleteMembership;

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setPendingDelete(null);
  }

  function cursorPagination(pager: ReturnType<typeof useCursorPager>, hasMore: boolean | undefined, nextCursor: string | null | undefined) {
    return {
      mode: "cursor" as const,
      pageSize: 20,
      hasMore: hasMore ?? false,
      hasPrevious: pager.hasPrevious,
      onNext: () => pager.goNext(nextCursor),
      onPrevious: pager.goPrevious,
    };
  }

  const membershipColumns: DataTableColumn<UnionMembership>[] = [
    { key: "userId", header: "User", cell: (r) => <span className="text-sm">{getUserDisplayName(memberById.get(r.userId))}</span> },
    { key: "unionName", header: "Union", cell: (r) => <span className="text-sm">{r.unionName}</span> },
    { key: "memberSince", header: "Since", cell: (r) => <span className="text-sm text-muted-foreground">{format(new Date(r.memberSince), "MMM d, yyyy")}</span> },
    { key: "status", header: "Status", cell: (r) => <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge> },
    {
      key: "actions", header: "",
      cell: (r) => canManage ? (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete({ kind: "memberships", id: r.id, label: r.unionName })}>Delete</Button>
      ) : null,
    },
  ];

  const agreementColumns: DataTableColumn<CollectiveAgreement>[] = [
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (r) => (
        <span className={cn("font-medium text-sm", TEXT_ONE_LINE)} title={r.title}>
          {r.title}
        </span>
      ),
    },
    { key: "unionName", header: "Union", cell: (r) => <span className="text-sm text-muted-foreground">{r.unionName}</span> },
    { key: "status", header: "Status", cell: (r) => <Badge variant={r.status === "active" ? "default" : r.status === "expired" ? "destructive" : "secondary"}>{r.status}</Badge> },
    { key: "expiresAt", header: "Expires", cell: (r) => <span className="text-sm text-muted-foreground">{r.expiresAt ? format(new Date(r.expiresAt), "MMM d, yyyy") : "—"}</span> },
    {
      key: "actions", header: "",
      cell: (r) => canManage ? (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete({ kind: "agreements", id: r.id, label: r.title })}>Delete</Button>
      ) : null,
    },
  ];

  const caseColumns: DataTableColumn<LaborCase>[] = [
    {
      key: "subject",
      header: "Subject",
      className: TABLE_TITLE_CELL,
      cell: (r) => (
        <span className={cn("font-medium text-sm", TEXT_ONE_LINE)} title={r.subject}>
          {r.subject}
        </span>
      ),
    },
    { key: "unionName", header: "Union", cell: (r) => <span className="text-sm text-muted-foreground">{r.unionName}</span> },
    { key: "status", header: "Status", cell: (r) => <Badge variant={r.status === "open" ? "destructive" : r.status === "resolved" ? "secondary" : "outline"}>{r.status}</Badge> },
    { key: "createdAt", header: "Created", cell: (r) => <span className="text-sm text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</span> },
    {
      key: "actions", header: "",
      cell: (r) => canManage ? (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete({ kind: "cases", id: r.id, label: r.subject })}>Delete</Button>
      ) : null,
    },
  ];

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "memberships", label: "Union Memberships" },
    { key: "agreements", label: "Collective Agreements" },
    { key: "cases", label: "Labor Cases" },
  ];

  const isLoading = activeTab === "memberships" ? membershipsLoading : activeTab === "agreements" ? agreementsLoading : casesLoading;
  const isError = activeTab === "memberships" ? membershipsIsError : activeTab === "agreements" ? agreementsIsError : casesIsError;
  const activeError = activeTab === "memberships" ? membershipsError : activeTab === "agreements" ? agreementsError : casesError;
  const pageState = usePageState({ permission: "hr:labor:view", isLoading, isError, error: activeError });

  const expiringCount = (expiring?.data ?? []).length;

  function handleTabChange(value: string) {
    const tab = ACTIVE_TABS.find((candidate) => candidate === value);
    if (tab) setActiveTab(tab);
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {expiringCount > 0 && (
        <div className="flex items-start gap-2 p-3 mb-4 shrink-0 border border-status-warning-rule bg-status-warning-surface rounded-lg text-sm text-status-warning-ink">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{expiringCount} collective agreement{expiringCount !== 1 ? "s" : ""} expiring within 30 days.</span>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4 shrink-0">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton columns={5} className="flex-1" />}
        onRetry={handleRetry}
        className="flex-1"
      >
      {activeTab === "memberships" ? (
        <>
          <div className="flex items-center justify-end mb-4">
            {canManage && <Button onClick={handleOpenSheet} size="sm"><PlusIcon size={16} className="mr-1.5" />Add</Button>}
          </div>
          <DataTable className="flex-1 min-h-0" columns={membershipColumns} data={memberships?.data ?? []} getRowKey={(r) => r.id}
            emptyState={
              <EmptyState
                className="border-0 bg-transparent min-h-[40vh]"
                illustration={<StateIllustration preset="team" className="h-24 w-24" />}
                title="No union memberships"
                description="Record union memberships to track employee union affiliations."
                action={canManage ? { label: "Add", onClick: handleOpenSheet } : undefined}
              />
            }
            pagination={cursorPagination(membershipPager, memberships?.pagination.hasMore, memberships?.pagination.nextCursor)}
          />
        </>
      ) : activeTab === "agreements" ? (
        <>
          <div className="flex items-center justify-end mb-4">
            {canManage && <Button onClick={handleOpenSheet} size="sm"><PlusIcon size={16} className="mr-1.5" />Add</Button>}
          </div>
          <DataTable className="flex-1 min-h-0" columns={agreementColumns} data={agreements?.data ?? []} getRowKey={(r) => r.id}
            emptyState={
              <EmptyState
                className="border-0 bg-transparent min-h-[40vh]"
                illustration={<StateIllustration preset="documents" className="h-24 w-24" />}
                title="No collective agreements"
                description="Record collective bargaining agreements with union bodies."
                action={canManage ? { label: "Add", onClick: handleOpenSheet } : undefined}
              />
            }
            pagination={cursorPagination(agreementPager, agreements?.pagination.hasMore, agreements?.pagination.nextCursor)}
          />
        </>
      ) : (
        <>
          <div className="flex items-center justify-end mb-4">
            {canManage && <Button onClick={handleOpenSheet} size="sm"><PlusIcon size={16} className="mr-1.5" />New Case</Button>}
          </div>
          <DataTable className="flex-1 min-h-0" columns={caseColumns} data={cases?.data ?? []} getRowKey={(r) => r.id}
            emptyState={
              <EmptyState
                className="border-0 bg-transparent min-h-[40vh]"
                illustration={<StateIllustration preset="approval" className="h-24 w-24" />}
                title="No labor cases"
                description="Log labor disputes and grievances raised by union bodies."
                action={canManage ? { label: "New Case", onClick: handleOpenSheet } : undefined}
              />
            }
            pagination={cursorPagination(casePager, cases?.pagination.hasMore, cases?.pagination.nextCursor)}
          />
        </>
      )}
      </PageState>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={handleDeleteDialogChange}
        title={`Delete "${pendingDelete?.label ?? ""}"?`}
        description="This record is removed from labor relations."
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmDelete}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {activeTab === "memberships" && (
            <>
              <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
                <SheetTitle>Add Union Membership</SheetTitle>
                <SheetDescription>Record a union membership for an employee.</SheetDescription>
              </SheetHeader>
              <Form {...membershipForm}>
                <form onSubmit={membershipForm.handleSubmit(handleCreateMembership)} className="flex min-h-0 flex-1 flex-col">
                  <SheetBody className="space-y-4 px-6 py-5">
                  <FormField control={membershipForm.control} name="userId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <FormControl>
                        <UserCombobox value={field.value} onChange={field.onChange} placeholder="Select employee" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={membershipForm.control} name="unionName" render={({ field }) => (
                    <FormItem><FormLabel>Union Name</FormLabel><FormControl><Input placeholder="Union name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={membershipForm.control} name="memberSince" render={({ field }) => (
                    <FormItem><FormLabel>Member Since</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={membershipForm.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  </SheetBody>
                  <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
                    <div className="grid w-full grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                      <LoadingButton type="submit" isPending={createMembership.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">Add</LoadingButton>
                    </div>
                  </SheetFooter>
                </form>
              </Form>
            </>
          )}
          {activeTab === "agreements" && (
            <>
              <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
                <SheetTitle>Add Collective Agreement</SheetTitle>
                <SheetDescription>Record a collective bargaining agreement with a union.</SheetDescription>
              </SheetHeader>
              <Form {...agreementForm}>
                <form onSubmit={agreementForm.handleSubmit(handleCreateAgreement)} className="flex min-h-0 flex-1 flex-col">
                  <SheetBody className="space-y-4 px-6 py-5">
                  <FormField control={agreementForm.control} name="unionName" render={({ field }) => (
                    <FormItem><FormLabel>Union Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={agreementForm.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Agreement Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={agreementForm.control} name="effectiveFrom" render={({ field }) => (
                    <FormItem><FormLabel>Effective From</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={agreementForm.control} name="expiresAt" render={({ field }) => (
                    <FormItem><FormLabel>Expires At (optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={agreementForm.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="negotiating">Negotiating</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  </SheetBody>
                  <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
                    <div className="grid w-full grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                      <LoadingButton type="submit" isPending={createAgreement.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">Add</LoadingButton>
                    </div>
                  </SheetFooter>
                </form>
              </Form>
            </>
          )}
          {activeTab === "cases" && (
            <>
              <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
                <SheetTitle>New Labor Case</SheetTitle>
                <SheetDescription>Log a labor dispute or grievance raised by a union.</SheetDescription>
              </SheetHeader>
              <Form {...caseForm}>
                <form onSubmit={caseForm.handleSubmit(handleCreateCase)} className="flex min-h-0 flex-1 flex-col">
                  <SheetBody className="space-y-4 px-6 py-5">
                  <FormField control={caseForm.control} name="unionName" render={({ field }) => (
                    <FormItem><FormLabel>Union Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={caseForm.control} name="subject" render={({ field }) => (
                    <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={caseForm.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  </SheetBody>
                  <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
                    <div className="grid w-full grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                      <LoadingButton type="submit" isPending={createCase.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">Create</LoadingButton>
                    </div>
                  </SheetFooter>
                </form>
              </Form>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
