"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Plus, MapPin, Phone, Mail, Pencil, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from "@/lib/api/hooks/branches";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Branch } from "@/types/organization";
import { COUNTRIES, STATES_BY_COUNTRY } from "@/lib/constants/geography";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const EMPTY_FORM = {
  name:"", code:"", city:"", state:"", country:"India",
  pincode:"", address:"", phone:"", email:"",
};

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-9 text-sm">
          <span className="truncate">{value || "Select country"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList className="max-h-56">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem key={c} value={c} onSelect={(v) => { onChange(v); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === c ? "opacity-100" : "opacity-0")} />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function StateSelect({ country, value, onChange, textValue, onTextChange, error }: {
  country: string;
  value: string;
  onChange: (v: string) => void;
  textValue: string;
  onTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  const states = STATES_BY_COUNTRY[country];
  if (!states) {
    return (
      <>
        <Input value={textValue} onChange={onTextChange} placeholder="e.g., Maharashtra" />
        {error && <p className="text-[11px] text-destructive">{error}</p>}
      </>
    );
  }
  return (
    <>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select state" />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {states.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </>
  );
}

const CODE_REGEX = /^[A-Z0-9-]{2,20}$/;
const PINCODE_REGEX = /^[A-Za-z0-9 -]{3,12}$/;
const PHONE_REGEX = /^[+()\d\s-]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEXT_FIELD_REGEX = /^(?!.*[^a-zA-Z0-9\s\-&,.()'\/])[a-zA-Z][a-zA-Z0-9\s\-&,.()'\/]*$/;

type FormErrors = Partial<Record<keyof typeof EMPTY_FORM, string>>;

export default function BranchManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editFormData, setEditFormData] = useState({ ...EMPTY_FORM });
  const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});

  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  const { data: branchList, isLoading } = useBranches();
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const deleteMutation = useDeleteBranch();

  const branches = branchList ?? [];

  useEffect(() => {
    if (editingBranch) {
      setEditFormData({
        name: editingBranch.name ??"",
        code: editingBranch.code ??"",
        city: editingBranch.city ??"",
        state: editingBranch.state ??"",
        country: editingBranch.country ??"India",
        pincode: editingBranch.pincode ??"",
        address: editingBranch.address ??"",
        phone: editingBranch.phone ??"",
        email: editingBranch.email ??"",
      });
      setEditFormErrors({});
    }
  }, [editingBranch]);

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key ==="code" ? e.target.value.toUpperCase() : e.target.value;
    setFormData((f) => ({ ...f, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setFormData((f) => ({ ...f, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setEdit = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key ==="code" ? e.target.value.toUpperCase() : e.target.value;
    setEditFormData((f) => ({ ...f, [key]: value }));
    setEditFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setEditField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setEditFormData((f) => ({ ...f, [key]: value }));
    setEditFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleCloseCreate = useCallback(() => {
    setShowCreate(false);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
  }, []);

  const validateForm = (data: typeof EMPTY_FORM, setErrors: (e: FormErrors) => void) => {
    const trimmed = {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      city: data.city.trim(),
      state: data.state.trim(),
      country: data.country.trim(),
      pincode: data.pincode.trim(),
      address: data.address.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
    };

    const errors: FormErrors = {};

    if (!trimmed.name) errors.name = "Branch name is required";
    else if (trimmed.name.length < 2) errors.name = "Branch name must be at least 2 characters";
    else if (trimmed.name.length > 100) errors.name = "Branch name must be at most 100 characters";
    else if (!TEXT_FIELD_REGEX.test(trimmed.name)) errors.name = "Branch name must start with a letter and contain only letters, numbers, spaces, and basic punctuation";

    if (!trimmed.code) errors.code = "Branch code is required";
    else if (!CODE_REGEX.test(trimmed.code)) errors.code = "Use 2–20 chars: A-Z, numbers, hyphen";

    if (trimmed.city) {
      if (trimmed.city.length < 2) errors.city = "City must be at least 2 characters";
      else if (trimmed.city.length > 80) errors.city = "City must be at most 80 characters";
      else if (!TEXT_FIELD_REGEX.test(trimmed.city)) errors.city = "City name must start with a letter and contain only letters, spaces, and basic punctuation";
    }

    if (trimmed.state) {
      if (trimmed.state.length < 2) errors.state = "State must be at least 2 characters";
      else if (trimmed.state.length > 80) errors.state = "State must be at most 80 characters";
      else if (!TEXT_FIELD_REGEX.test(trimmed.state)) errors.state = "State name must start with a letter and contain only letters, spaces, and basic punctuation";
    }

    if (trimmed.address && trimmed.address.length > 500) errors.address = "Address must be at most 500 characters";

    if (trimmed.email && !EMAIL_REGEX.test(trimmed.email)) {
      errors.email = "Enter a valid email";
    }

    if (trimmed.phone && !PHONE_REGEX.test(trimmed.phone)) {
      errors.phone = "Enter a valid phone number";
    }

    if (trimmed.pincode && !PINCODE_REGEX.test(trimmed.pincode)) {
      errors.pincode = "Enter a valid pincode";
    }

    setErrors(errors);
    if (Object.keys(errors).length > 0) return null;
    return trimmed;
  };

  const handleCreate = () => {
    const validData = validateForm(formData, setFormErrors);
    if (!validData) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    createMutation.mutate(validData, {
      onSuccess: () => {
        toast.success("Branch created");
        setShowCreate(false);
        setFormData({ ...EMPTY_FORM });
        setFormErrors({});
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleUpdate = () => {
    if (!editingBranch) return;
    const validData = validateForm(editFormData, setEditFormErrors);
    if (!validData) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    updateMutation.mutate(
      { id: editingBranch.id, ...validData },
      {
        onSuccess: () => {
          toast.success("Branch updated");
          setEditingBranch(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = () => {
    if (!deletingBranch) return;
    deleteMutation.mutate(deletingBranch.id, {
      onSuccess: () => {
        toast.success("Branch deleted");
        setDeletingBranch(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const branchFormFields = (
    data: typeof EMPTY_FORM,
    setter: (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => void,
    fieldSetter: (key: keyof typeof EMPTY_FORM, value: string) => void,
    errors: FormErrors
  ) => (
    <div className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Branch Name *</Label>
          <Input value={data.name} onChange={setter("name")} placeholder="e.g., Mumbai Office" />
          {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Branch Code *</Label>
          <Input value={data.code} onChange={setter("code")} placeholder="e.g., MUM-01" />
          {errors.code && <p className="text-[11px] text-destructive">{errors.code}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Country</Label>
          <CountrySelect
            value={data.country}
            onChange={(v) => {
              fieldSetter("country", v);
              fieldSetter("state", "");
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Pincode</Label>
          <Input value={data.pincode} onChange={setter("pincode")} placeholder="e.g., 400001" />
          {errors.pincode && <p className="text-[11px] text-destructive">{errors.pincode}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">State</Label>
          <StateSelect
            country={data.country}
            value={data.state}
            onChange={(v) => fieldSetter("state", v)}
            textValue={data.state}
            onTextChange={setter("state")}
            error={errors.state}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input value={data.city} onChange={setter("city")} placeholder="e.g., Mumbai" />
          {errors.city && <p className="text-[11px] text-destructive">{errors.city}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Address</Label>
        <Input value={data.address} onChange={setter("address")} placeholder="Full street address" maxLength={500} />
        {errors.address && <p className="text-[11px] text-destructive">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input value={data.phone} onChange={setter("phone")} placeholder="e.g., +91 9876543210" />
          {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input value={data.email} onChange={setter("email")} placeholder="branch@company.com" />
          {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Branch Management"
      subtitle="Manage your organization's branch offices"
      badge={branches.length > 0 ? String(branches.length) : undefined}
      actions={
        <Button onClick={handleOpenCreate} >
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </Button>
      }
    >
      <div className="space-y-6">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <EmptyTeamIllustration className="mx-auto mb-4 w-40 h-40" />
            <p className="text-sm font-medium text-foreground">No branches yet</p>
            <p className="text-xs mt-1">Create a branch to set up your multi-branch hierarchy.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {branches.map((branch) => (
            <Card key={branch.id} className="hover:border-blue-500/30 transition-colors h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{branch.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{branch.code}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={cn("text-[10px]",
                      branch.status ==="ACTIVE" ?"text-emerald-400 bg-emerald-500/10" :"text-muted-foreground"
                    )}>
                      {branch.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingBranch(branch)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeletingBranch(branch)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                {(branch.city || branch.state) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {[branch.city, branch.state, branch.country].filter(Boolean).join(",")}
                    {branch.pincode && <span className="font-mono">— {branch.pincode}</span>}
                  </p>
                )}
                {branch.address && (
                  <p className="text-xs text-muted-foreground">{branch.address}</p>
                )}
                {branch.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {branch.phone}
                  </p>
                )}
                {branch.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> {branch.email}
                  </p>
                )}

                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Branch Manager</span>
                    {branch.branchManager ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px]">{branch.branchManager.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{branch.branchManager.name}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Not assigned</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Branch HR</span>
                    {branch.branchHr ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px]">{branch.branchHr.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{branch.branchHr.name}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Not assigned</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      <Sheet open={showCreate} onOpenChange={(open) => { if (!open) handleCloseCreate(); else setShowCreate(true); }}>
        <SheetContent className="sm:max-w-md p-0 gap-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-sm">Create Branch</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            {branchFormFields(formData, set, setField, formErrors)}
          </ScrollArea>

          <div className="shrink-0 border-t px-4 py-3 bg-background">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCloseCreate}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!formData.name || !formData.code || createMutation.isPending}
                onClick={handleCreate}
              >
                Create Branch
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editingBranch} onOpenChange={(open) => { if (!open) setEditingBranch(null); }}>
        <SheetContent className="sm:max-w-md p-0 gap-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-sm">Edit Branch</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            {branchFormFields(editFormData, setEdit, setEditField, editFormErrors)}
          </ScrollArea>

          <div className="shrink-0 border-t px-4 py-3 bg-background">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingBranch(null)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!editFormData.name || !editFormData.code || updateMutation.isPending}
                onClick={handleUpdate}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deletingBranch}
        onOpenChange={(open) => { if (!open) setDeletingBranch(null); }}
        title="Delete Branch"
        description={`Are you sure you want to delete"${deletingBranch?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
