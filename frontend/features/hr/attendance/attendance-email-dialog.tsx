"use client";

import {
  useState,
  useMemo,
  useCallback,
} from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { MailIcon, XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { useHrEmployees, unwrapEmployees } from "@/hooks/api/hr";
import { useCan } from "@/hooks/api/access";
import type { Employee } from "@/types/hr";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

const MAX_REPORT_RECIPIENTS = 10;
const MAX_REPORT_DAYS = 31;

function getLocalToday(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

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
}

function BadgeRemoveButton({ name, onClick }: { name: string; onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      className="rounded-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={onClick}
      aria-label={`Remove ${name}`}
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={12} />
    </button>
  );
}

function SendReportButton({ isSending, disabled, onClick }: { isSending: boolean; disabled: boolean; onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      onClick={onClick}
      disabled={disabled}
      isPending={isSending}
      loadingText="Sending..."
      className="h-9 gap-1.5 flex-1"
      {...hoverHandlers}
    >
      <MailIcon ref={iconRef} size={14} />
      Send Report
    </LoadingButton>
  );
}

function MailTriggerButton({ toolbar = false }: { toolbar?: boolean }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      type="button"
      variant={toolbar ? "outline" : "ghost"}
      size={toolbar ? "sm" : "default"}
      className={
        toolbar
          ? "h-8 gap-1.5"
          : "h-auto gap-1.5 px-0 py-0 text-xs font-semibold text-primary hover:bg-transparent hover:text-primary/80"
      }
      {...hoverHandlers}
    >
      <MailIcon ref={iconRef} size={14} className={toolbar ? "mr-0" : undefined} />
      {toolbar ? "Email" : "Email Report"}
    </Button>
  );
}

function MultiSelectField({
  label,
  placeholder,
  selected,
  onAdd,
  onRemove,
  options,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);

  const available = useMemo(
    () =>
      options.filter(
        (option) => !selected.includes(option.email),
      ),
    [options, selected],
  );

  const selectedOptions = useMemo(
    () => options.filter((o) => selected.includes(o.email)),
    [options, selected],
  );

  const handleSelect = (email: string) => {
    onAdd(email);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between h-9 rounded-md border border-input bg-background px-3 text-sm text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors duration-200"
            aria-expanded={open}
          >
            <span className="text-muted-foreground truncate text-xs">
              {placeholder}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search by name or email..."
              className="text-xs"
            />
            <CommandList className="max-h-48 overflow-y-auto">
              <CommandEmpty className="text-xs py-4">
                No users available
              </CommandEmpty>
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
                      <span className="text-muted-foreground truncate">
                        {opt.email}
                      </span>
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
              <BadgeRemoveButton name={opt.name} onClick={() => onRemove(opt.email)} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function AttendanceEmailDialogContent({ toolbar = false }: { toolbar?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: employeesData } = useHrEmployees({ limit: 100 });
  const allUsers = useMemo<UserOption[]>(() => {
    const raw = employeesData
      ? unwrapEmployees(employeesData)
      : [];
    return (raw as Employee[])
      .filter((e) => e.isActive && e.email)
      .map((e) => ({
        id: e.id,
        name: [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email,
        email: e.email.trim().toLowerCase(),
      }));
  }, [employeesData]);

  const totalCount = recipientEmails.length;

  const addRecipient = useCallback(
    (email: string) => {
      if (totalCount >= MAX_REPORT_RECIPIENTS) {
        toast.error(`You can select up to ${MAX_REPORT_RECIPIENTS} recipients`);
        return;
      }
      setRecipientEmails((previous) => [...previous, email]);
    },
    [totalCount],
  );
  const removeRecipient = useCallback(
    (email: string) =>
      setRecipientEmails((previous) =>
        previous.filter((candidate) => candidate !== email),
      ),
    [],
  );

  const dateError = useMemo(() => {
    const today = getLocalToday();
    if (Boolean(startDate) !== Boolean(endDate))
      return "Select both a start date and an end date";
    if (startDate && startDate > today)
      return "Start date cannot be in the future";
    if (endDate && endDate > today) return "End date cannot be in the future";
    if (startDate && endDate && startDate > endDate)
      return "Start date must be before end date";
    if (startDate && endDate) {
      const dayCount =
        (Date.parse(`${endDate}T00:00:00Z`) -
          Date.parse(`${startDate}T00:00:00Z`)) /
          86_400_000 +
        1;
      if (dayCount > MAX_REPORT_DAYS)
        return `Date range cannot exceed ${MAX_REPORT_DAYS} days`;
    }
    return null;
  }, [startDate, endDate]);

  const handleClose = () => {
    setOpen(false);
    setRecipientEmails([]);
    setStartDate("");
    setEndDate("");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) handleClose();
    else setOpen(true);
  };

  const handleSend = async () => {
    if (recipientEmails.length === 0) {
      toast.error("At least one recipient is required");
      return;
    }
    if (dateError) {
      toast.error(dateError);
      return;
    }

    setIsSending(true);
    try {
      await apiClient.post("/hr/attendance/email-report", {
        to: recipientEmails,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      toast.success("Attendance report queued for delivery");
      handleClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <MailTriggerButton toolbar={toolbar} />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MailIcon size={14} className="text-primary" />
            </div>
            Email Attendance Report
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Send up to {MAX_REPORT_DAYS} days of scoped attendance data to active
            organization members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-2 block">
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground">
                  From
                </Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Start date"
                  toDate={new Date()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground">
                  To
                </Label>
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
              label="Recipients *"
              placeholder="Select recipients..."
              selected={recipientEmails}
              onAdd={addRecipient}
              onRemove={removeRecipient}
              options={allUsers}
            />
          </div>

          {totalCount > 0 && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{totalCount}</span>
              {" of "}
              {MAX_REPORT_RECIPIENTS} recipients selected. Each person receives a
              private copy.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isSending}
            className="h-9"
          >
            Cancel
          </Button>
          <SendReportButton
            isSending={isSending}
            disabled={isSending || recipientEmails.length === 0 || !!dateError}
            onClick={handleSend}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AttendanceEmailDialog({ toolbar = false }: { toolbar?: boolean }) {
  const canEmailAttendanceReports = useCan("hr:attendance:manage");
  if (!canEmailAttendanceReports) return null;
  return <AttendanceEmailDialogContent toolbar={toolbar} />;
}
