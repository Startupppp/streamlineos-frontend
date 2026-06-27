"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { AppSheet } from "@/components/shared/app-sheet";
import { useVendors, useCreateVendor } from "@/lib/api/hooks/inventory";
import type { CreateVendorInput } from "@/types/inventory";

function VendorFormSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateVendor();
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [leadTimeDays, setLeadTimeDays] = useState<string>("7");
  const [paymentTermsDays, setPaymentTermsDays] = useState<string>("30");
  const [currency, setCurrency] = useState<string>("INR");
  const [notes, setNotes] = useState<string>("");

  function resetForm(): void {
    setName("");
    setCode("");
    setEmail("");
    setPhone("");
    setAddress("");
    setGstin("");
    setLeadTimeDays("7");
    setPaymentTermsDays("30");
    setCurrency("INR");
    setNotes("");
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleNameChange(e: ChangeEvent<HTMLInputElement>): void { setName(e.target.value); }
  function handleCodeChange(e: ChangeEvent<HTMLInputElement>): void { setCode(e.target.value); }
  function handleEmailChange(e: ChangeEvent<HTMLInputElement>): void { setEmail(e.target.value); }
  function handlePhoneChange(e: ChangeEvent<HTMLInputElement>): void { setPhone(e.target.value); }
  function handleAddressChange(e: ChangeEvent<HTMLTextAreaElement>): void { setAddress(e.target.value); }
  function handleGstinChange(e: ChangeEvent<HTMLInputElement>): void { setGstin(e.target.value.toUpperCase()); }
  function handleLeadTimeDaysChange(e: ChangeEvent<HTMLInputElement>): void { setLeadTimeDays(e.target.value); }
  function handlePaymentTermsDaysChange(e: ChangeEvent<HTMLInputElement>): void { setPaymentTermsDays(e.target.value); }
  function handleCurrencyChange(e: ChangeEvent<HTMLInputElement>): void { setCurrency(e.target.value.toUpperCase()); }
  function handleNotesChange(e: ChangeEvent<HTMLTextAreaElement>): void { setNotes(e.target.value); }

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    const payload: CreateVendorInput = {
      name: name.trim(),
      code: code.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      gstin: gstin.trim() || undefined,
      leadTimeDays: Number(leadTimeDays) || 7,
      paymentTermsDays: Number(paymentTermsDays) || 30,
      currency: currency.trim() || "INR",
      notes: notes.trim() || undefined,
    };
    try {
      await createMutation.mutateAsync(payload);
      toast.success(`Vendor "${payload.name}" created`);
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create vendor");
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="New Vendor"
      description="Add a supplier for inventory purchase orders."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create vendor"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Name *</label>
          <Input value={name} onChange={handleNameChange} placeholder="Acme Supplies" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Code</label>
            <Input value={code} onChange={handleCodeChange} placeholder="Auto-generated" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Currency</label>
            <Input value={currency} onChange={handleCurrencyChange} maxLength={3} placeholder="INR" />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Email</label>
          <Input type="email" value={email} onChange={handleEmailChange} placeholder="orders@supplier.com" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Phone</label>
          <Input value={phone} onChange={handlePhoneChange} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">GSTIN</label>
          <Input value={gstin} onChange={handleGstinChange} placeholder="15-char GSTIN" maxLength={15} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Lead time (days)</label>
            <Input type="number" min="0" value={leadTimeDays} onChange={handleLeadTimeDaysChange} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Payment terms (days)</label>
            <Input type="number" min="0" value={paymentTermsDays} onChange={handlePaymentTermsDaysChange} />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Address</label>
          <textarea
            value={address}
            onChange={handleAddressChange}
            rows={3}
            placeholder="Street, city, state, PIN"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            rows={2}
            placeholder="Any internal notes"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>
      </div>
    </AppSheet>
  );
}

export default function VendorsListPage() {
  const [search, setSearch] = useState<string>("");
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const query = useVendors({ page: 1, limit: 100, search: search || undefined });
  const items = query.data?.items ?? [];

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
  }

  function handleNewVendor(): void {
    setSheetOpen(true);
  }

  return (
    <PageWrapper
      eyebrow="Inventory · Vendors"
      title="Vendors"
      subtitle="Suppliers for inventory purchase orders."
      actions={
        <Button size="sm" onClick={handleNewVendor}>
          <Plus className="size-4 mr-1" />
          New vendor
        </Button>
      }
    >
      <div className="mb-4">
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search vendors…"
          className="max-w-xs"
        />
      </div>

      {query.isLoading && <LoadingState variant="table" rows={6} />}
      {query.error && <ErrorState description={query.error.message} />}

      {!query.isLoading && !query.error && items.length === 0 && (
        <EmptyState
          illustration={<EmptyTeamIllustration />}
          title="No vendors yet"
          description="Add a supplier to start creating purchase orders."
          action={{ label: "New vendor", onClick: handleNewVendor }}
        />
      )}

      {items.length > 0 && (
        <Card className="overflow-x-auto">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Lead time</TableHead>
                <TableHead className="text-right">Payment terms</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Link
                      href={`/inventory/vendors/${v.id}`}
                      className="text-sm font-medium text-foreground hover:text-blue-600 hover:underline"
                    >
                      {v.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.code}</TableCell>
                  <TableCell className="text-sm">{v.email ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{v.leadTimeDays} days</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">Net {v.paymentTermsDays}</TableCell>
                  <TableCell>
                    <Badge variant={v.isActive ? "default" : "secondary"}>
                      {v.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <VendorFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
