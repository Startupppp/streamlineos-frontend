"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Users, FileText, Briefcase, AlertTriangle, Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
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

type ActiveTab = "memberships" | "agreements" | "cases";

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
  const [membershipPage, setMembershipPage] = useState(1);
  const [agreementPage, setAgreementPage] = useState(1);
  const [casePage, setCasePage] = useState(1);

  const { data: memberships, isLoading: membershipsLoading } = useUnionMemberships({ page: membershipPage, limit: 20 });
  const { data: agreements, isLoading: agreementsLoading } = useCollectiveAgreements({ page: agreementPage, limit: 20 });
  const { data: cases, isLoading: casesLoading } = useLaborCases({ page: casePage, limit: 20 });
  const { data: expiring } = useExpiringAgreements(30);

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

  const membershipColumns: DataTableColumn<UnionMembership>[] = [
    { key: "userId", header: "User", cell: (r) => <span className="text-sm">{r.userId}</span> },
    { key: "unionName", header: "Union", cell: (r) => <span className="text-sm">{r.unionName}</span> },
    { key: "memberSince", header: "Since", cell: (r) => <span className="text-sm text-muted-foreground">{new Date(r.memberSince).toLocaleDateString()}</span> },
    { key: "status", header: "Status", cell: (r) => <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge> },
    {
      key: "actions", header: "",
      cell: (r) => canManage ? (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteMembership.mutate(r.id)} disabled={deleteMembership.isPending}>Delete</Button>
      ) : null,
    },
  ];

  const agreementColumns: DataTableColumn<CollectiveAgreement>[] = [
    { key: "title", header: "Title", cell: (r) => <span className="font-medium text-sm">{r.title}</span> },
    { key: "unionName", header: "Union", cell: (r) => <span className="text-sm text-muted-foreground">{r.unionName}</span> },
    { key: "status", header: "Status", cell: (r) => <Badge variant={r.status === "active" ? "default" : r.status === "expired" ? "destructive" : "secondary"}>{r.status}</Badge> },
    { key: "expiresAt", header: "Expires", cell: (r) => <span className="text-sm text-muted-foreground">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—"}</span> },
    {
      key: "actions", header: "",
      cell: (r) => canManage ? (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteAgreement.mutate(r.id)} disabled={deleteAgreement.isPending}>Delete</Button>
      ) : null,
    },
  ];

  const caseColumns: DataTableColumn<LaborCase>[] = [
    { key: "subject", header: "Subject", cell: (r) => <span className="font-medium text-sm">{r.subject}</span> },
    { key: "unionName", header: "Union", cell: (r) => <span className="text-sm text-muted-foreground">{r.unionName}</span> },
    { key: "status", header: "Status", cell: (r) => <Badge variant={r.status === "open" ? "destructive" : r.status === "resolved" ? "secondary" : "outline"}>{r.status}</Badge> },
    { key: "createdAt", header: "Created", cell: (r) => <span className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span> },
    {
      key: "actions", header: "",
      cell: (r) => canManage ? (
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteCase.mutate(r.id)} disabled={deleteCase.isPending}>Delete</Button>
      ) : null,
    },
  ];

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "memberships", label: "Union Memberships" },
    { key: "agreements", label: "Collective Agreements" },
    { key: "cases", label: "Labor Cases" },
  ];

  const isLoading = activeTab === "memberships" ? membershipsLoading : activeTab === "agreements" ? agreementsLoading : casesLoading;

  return (
    <>
      {(expiring?.data ?? []).length > 0 && (
        <div className="flex items-start gap-2 p-3 mb-4 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{expiring!.data.length} collective agreement{expiring!.data.length !== 1 ? "s" : ""} expiring within 30 days.</span>
        </div>
      )}
      <div className="flex gap-1 border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : activeTab === "memberships" ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{memberships?.total ?? 0} memberships</p>
            {canManage && <Button onClick={handleOpenSheet} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="h-4 w-4 mr-1.5" />Add</Button>}
          </div>
          <DataTable columns={membershipColumns} data={memberships?.data ?? []} getRowKey={(r) => r.id}
            emptyState={<div className="flex flex-col items-center py-12"><Users className="h-8 w-8 text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No union memberships.</p></div>}
            pagination={{ mode: "server", page: membershipPage, pageSize: 20, total: memberships?.total ?? 0, onPageChange: setMembershipPage }}
          />
        </>
      ) : activeTab === "agreements" ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{agreements?.total ?? 0} agreements</p>
            {canManage && <Button onClick={handleOpenSheet} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="h-4 w-4 mr-1.5" />Add</Button>}
          </div>
          <DataTable columns={agreementColumns} data={agreements?.data ?? []} getRowKey={(r) => r.id}
            emptyState={<div className="flex flex-col items-center py-12"><FileText className="h-8 w-8 text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No collective agreements.</p></div>}
            pagination={{ mode: "server", page: agreementPage, pageSize: 20, total: agreements?.total ?? 0, onPageChange: setAgreementPage }}
          />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{cases?.total ?? 0} cases</p>
            {canManage && <Button onClick={handleOpenSheet} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="h-4 w-4 mr-1.5" />New Case</Button>}
          </div>
          <DataTable columns={caseColumns} data={cases?.data ?? []} getRowKey={(r) => r.id}
            emptyState={<div className="flex flex-col items-center py-12"><Briefcase className="h-8 w-8 text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No labor cases.</p></div>}
            pagination={{ mode: "server", page: casePage, pageSize: 20, total: cases?.total ?? 0, onPageChange: setCasePage }}
          />
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={(v) => !v && setSheetOpen(false)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {activeTab === "memberships" && (
            <>
              <SheetHeader>
                <SheetTitle>Add Union Membership</SheetTitle>
                <SheetDescription>Record a union membership for an employee.</SheetDescription>
              </SheetHeader>
              <Form {...membershipForm}>
                <form onSubmit={membershipForm.handleSubmit(handleCreateMembership)} className="mt-4 space-y-4">
                  <FormField control={membershipForm.control} name="userId" render={({ field }) => (
                    <FormItem><FormLabel>User ID</FormLabel><FormControl><Input placeholder="user-uuid" {...field} /></FormControl><FormMessage /></FormItem>
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
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                    <LoadingButton type="submit" isPending={createMembership.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">Add</LoadingButton>
                  </div>
                </form>
              </Form>
            </>
          )}
          {activeTab === "agreements" && (
            <>
              <SheetHeader>
                <SheetTitle>Add Collective Agreement</SheetTitle>
                <SheetDescription>Record a collective bargaining agreement with a union.</SheetDescription>
              </SheetHeader>
              <Form {...agreementForm}>
                <form onSubmit={agreementForm.handleSubmit(handleCreateAgreement)} className="mt-4 space-y-4">
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
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                    <LoadingButton type="submit" isPending={createAgreement.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">Add</LoadingButton>
                  </div>
                </form>
              </Form>
            </>
          )}
          {activeTab === "cases" && (
            <>
              <SheetHeader>
                <SheetTitle>New Labor Case</SheetTitle>
                <SheetDescription>Log a labor dispute or grievance raised by a union.</SheetDescription>
              </SheetHeader>
              <Form {...caseForm}>
                <form onSubmit={caseForm.handleSubmit(handleCreateCase)} className="mt-4 space-y-4">
                  <FormField control={caseForm.control} name="unionName" render={({ field }) => (
                    <FormItem><FormLabel>Union Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={caseForm.control} name="subject" render={({ field }) => (
                    <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={caseForm.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                    <LoadingButton type="submit" isPending={createCase.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">Create</LoadingButton>
                  </div>
                </form>
              </Form>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
