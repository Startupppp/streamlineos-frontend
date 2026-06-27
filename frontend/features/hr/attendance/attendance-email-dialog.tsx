"use client";

import { useState, useMemo, useCallback } from "react";
import { Mail, X, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import type { Employee, PaginatedEmployees } from "@/types/hr";
import { emailAttendanceReport } from "@/server/actions/attendance-export";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface MultiSelectFieldProps {
  label: string;
  placeholder: string;
  selected: string[];
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
  options: UserOption[];
  excludedEmails: string[];
}

function MultiSelectField({
  label,
  placeholder,
  selected,
  onAdd,
  onRemove,
  options,
  excludedEmails,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);

  const available = useMemo(
    () => options.filter((o) => !excludedEmails.includes(o.email) && !selected.includes(o.email)),
    [options, excludedEmails, selected]
  );

  const selectedOptions = useMemo(
    () => options.filter((o) => selected.includes(o.email)),
    [options, selected]
  );

  const handleSelect = (email: string) => {
    onAdd(email);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 text-sm text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors duration-200"
            aria-expanded={open}
          >
            <span className="text-muted-foreground truncate text-xs">{placeholder}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name or email..." className="h-8 text-xs" />
            <CommandList className="max-h-48 overflow-y-auto">
              <CommandEmpty className="text-xs py-4">No users available</CommandEmpty>
              <CommandGroup>
                {available.map((opt) => (
                  <CommandItem
                    key={opt.email}
                    value={`${opt.name} ${opt.email}`}
                    onSelect={() => handleSelect(opt.email)}
                    className="text-xs"
                  >
                    <Check className="h-3.5 w-3.5 mr-2 opacity-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{opt.name}</span>
                      <span className="text-muted-foreground truncate">{opt.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {selectedOptions.map((opt) => (
            <Badge
              key={opt.email}
              variant="secondary"
              className="gap-1 pr-1 text-[10px] font-semibold"
            >
              {opt.name}
              <button
                type="button"
                className="rounded-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => onRemove(opt.email)}
                aria-label={`Remove ${opt.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttendanceEmailDialog() {
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: employeesData } = useHrEmployees({ limit: 200 });
  const allUsers = useMemo<UserOption[]>(() => {
    const raw = employeesData
      ? Array.isArray(employeesData)
        ? (employeesData as Employee[])
        : ((employeesData as PaginatedEmployees).data ?? [])
      : [];
    return (raw as Employee[])
      .filter((e) => e.isActive && e.email)
      .map((e) => ({
        id: e.id,
        name: [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email,
        email: e.email,
      }));
  }, [employeesData]);

  const toExcludedForCc = useMemo(() => toEmails, [toEmails]);

  const addTo = useCallback((email: string) => setToEmails((prev) => [...prev, email]), []);
  const removeTo = useCallback((email: string) => setToEmails((prev) => prev.filter((e) => e !== email)), []);

  const addCc = useCallback((email: string) => setCcEmails((prev) => [...prev, email]), []);
  const removeCc = useCallback((email: string) => setCcEmails((prev) => prev.filter((e) => e !== email)), []);

  const addBcc = useCallback((email: string) => setBccEmails((prev) => [...prev.filter((e) => e !== email), email]), []);
  const removeBcc = useCallback((email: string) => setBccEmails((prev) => prev.filter((e) => e !== email)), []);

  const dateError = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (startDate && startDate > today) return "Start date cannot be in the future";
    if (endDate && endDate > today) return "End date cannot be in the future";
    if (startDate && endDate && startDate > endDate) return "Start date must be before end date";
    return null;
  }, [startDate, endDate]);

  const handleClose = () => {
    setOpen(false);
    setToEmails([]);
    setCcEmails([]);
    setBccEmails([]);
    setStartDate("");
    setEndDate("");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) handleClose();
    else setOpen(true);
  };

  const handleSend = async () => {
    if (toEmails.length === 0) {
      toast.error("At least one To recipient is required");
      return;
    }
    if (dateError) {
      toast.error(dateError);
      return;
    }

    setIsSending(true);
    try {
      const result = await emailAttendanceReport({
        to: toEmails,
        cc: ccEmails,
        bcc: bccEmails,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (result.success) {
        toast.success("Attendance report sent successfully");
        handleClose();
      } else {
        toast.error(result.error ?? "Failed to send report");
      }
    } catch {
      toast.error("Failed to send attendance report");
    } finally {
      setIsSending(false);
    }
  };

  const totalCount = [...toEmails, ...ccEmails, ...bccEmails].length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors duration-200"
          type="button"
        >
          <Mail className="h-3.5 w-3.5" />
          Email Report
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            Email Attendance Report
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select recipients and an optional date range for the report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-2 block">
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground">From</Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Start date"
                  toDate={new Date()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground">To</Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="End date"
                  toDate={new Date()}
                />
              </div>
            </div>
            {dateError && (
              <p className="text-[11px] text-destructive mt-1.5">{dateError}</p>
            )}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <MultiSelectField
              label="To *"
              placeholder="Select recipients..."
              selected={toEmails}
              onAdd={addTo}
              onRemove={removeTo}
              options={allUsers}
              excludedEmails={[...ccEmails, ...bccEmails]}
            />

            <MultiSelectField
              label="CC"
              placeholder="Add CC recipients..."
              selected={ccEmails}
              onAdd={addCc}
              onRemove={removeCc}
              options={allUsers}
              excludedEmails={[...toExcludedForCc, ...bccEmails]}
            />

            <MultiSelectField
              label="BCC"
              placeholder="Add BCC recipients..."
              selected={bccEmails}
              onAdd={addBcc}
              onRemove={removeBcc}
              options={allUsers}
              excludedEmails={[...new Set([...toEmails, ...ccEmails])]}
            />
          </div>

          {totalCount > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Sending to <span className="font-semibold text-foreground">{toEmails.length}</span> recipient(s)
              {ccEmails.length > 0 && <>, <span className="font-semibold text-foreground">{ccEmails.length}</span> CC</>}
              {bccEmails.length > 0 && <>, <span className="font-semibold text-foreground">{bccEmails.length}</span> BCC</>}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSending} className="h-9">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || toEmails.length === 0 || !!dateError}
            className="h-9 gap-1.5 flex-1"
          >
            {isSending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                Send Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
