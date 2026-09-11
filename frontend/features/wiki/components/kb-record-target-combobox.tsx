"use client";

import { useMemo, useState, useCallback } from "react";
import { Combobox } from "@/components/ui/combobox";
import { ProjectCombobox } from "@/components/ui/project-combobox";
import { SupportTicketCombobox } from "@/components/ui/support-ticket-combobox";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useLeads, useLeadDetail } from "@/hooks/api/leads";
import { useDeals, useDealDetail } from "@/hooks/api/crm/deals";
import { useContacts, useContactDetail } from "@/hooks/api/crm/contacts";
import { useHrEmployees } from "@/hooks/api/hr/employees";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import type { EmployeeListItem } from "@/types/hr";

export type KbRecordTargetType =
  | "crm_lead"
  | "crm_deal"
  | "crm_contact"
  | "project"
  | "project_ticket"
  | "support_ticket"
  | "hr_employee";

interface KbRecordTargetComboboxProps {
  targetType: KbRecordTargetType | "";
  value: string;
  onChange: (value: string, label?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function normalizeEmployees(
  raw: EmployeeListItem[] | { data: EmployeeListItem[] } | undefined,
): EmployeeListItem[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : raw.data ?? [];
}

function LeadTargetCombobox({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: Omit<KbRecordTargetComboboxProps, "targetType">) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isFetching } = useLeads(
    { search: debouncedSearch || undefined, limit: 50 },
    { enabled: true },
  );

  const numericLookup =
    /^\d+$/.test(debouncedSearch.trim()) ? Number(debouncedSearch.trim()) : 0;
  const { data: lookedUpLead } = useLeadDetail(numericLookup);

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const seen = new Set<number>();
    const merged = [];

    if (
      lookedUpLead &&
      (!q ||
        String(lookedUpLead.id).includes(q) ||
        lookedUpLead.name.toLowerCase().includes(q) ||
        (lookedUpLead.email?.toLowerCase().includes(q) ?? false))
    ) {
      merged.push(lookedUpLead);
      seen.add(lookedUpLead.id);
    }

    for (const lead of data?.leads ?? []) {
      if (seen.has(lead.id)) continue;
      merged.push(lead);
      seen.add(lead.id);
    }

    return merged.slice(0, 50).map((lead) => ({
      value: String(lead.id),
      label: lead.name,
      sublabel: lead.email ?? lead.company ?? undefined,
    }));
  }, [data?.leads, debouncedSearch, lookedUpLead]);

  const handleSearchChange = useCallback((q: string) => setSearch(q), []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? "Search leads…"}
      searchPlaceholder="Search by name, email, or ID…"
      emptyText={isFetching ? "Loading leads…" : "No leads found."}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}

function DealTargetCombobox({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: Omit<KbRecordTargetComboboxProps, "targetType">) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: deals = [], isFetching } = useDeals({ limit: 100 });

  const numericLookup =
    /^\d+$/.test(debouncedSearch.trim()) ? Number(debouncedSearch.trim()) : 0;
  const { data: lookedUpDeal } = useDealDetail(numericLookup);

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const seen = new Set<number>();
    const merged = [];

    if (
      lookedUpDeal &&
      (!q ||
        String(lookedUpDeal.id).includes(q) ||
        lookedUpDeal.name.toLowerCase().includes(q))
    ) {
      merged.push(lookedUpDeal);
      seen.add(lookedUpDeal.id);
    }

    for (const deal of deals) {
      if (seen.has(deal.id)) continue;
      if (
        q &&
        !String(deal.id).includes(q) &&
        !deal.name.toLowerCase().includes(q)
      ) {
        continue;
      }
      merged.push(deal);
      seen.add(deal.id);
    }

    return merged.slice(0, 50).map((deal) => ({
      value: String(deal.id),
      label: deal.name,
      sublabel: deal.stage.replace("_", " "),
    }));
  }, [deals, debouncedSearch, lookedUpDeal]);

  const handleSearchChange = useCallback((q: string) => setSearch(q), []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? "Search deals…"}
      searchPlaceholder="Search by name or ID…"
      emptyText={isFetching ? "Loading deals…" : "No deals found."}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}

function ContactTargetCombobox({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: Omit<KbRecordTargetComboboxProps, "targetType">) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isFetching } = useContacts({
    search: debouncedSearch || undefined,
    limit: 50,
  });

  const numericLookup =
    /^\d+$/.test(debouncedSearch.trim()) ? Number(debouncedSearch.trim()) : 0;
  const { data: lookedUpContact } = useContactDetail(numericLookup);

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const seen = new Set<number>();
    const merged = [];

    if (
      lookedUpContact &&
      (!q ||
        String(lookedUpContact.id).includes(q) ||
        lookedUpContact.name.toLowerCase().includes(q) ||
        (lookedUpContact.email?.toLowerCase().includes(q) ?? false))
    ) {
      merged.push(lookedUpContact);
      seen.add(lookedUpContact.id);
    }

    for (const contact of data?.items ?? []) {
      if (seen.has(contact.id)) continue;
      merged.push(contact);
      seen.add(contact.id);
    }

    return merged.slice(0, 50).map((contact) => ({
      value: String(contact.id),
      label: contact.name,
      sublabel: contact.email ?? contact.company ?? undefined,
    }));
  }, [data?.items, debouncedSearch, lookedUpContact]);

  const handleSearchChange = useCallback((q: string) => setSearch(q), []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? "Search contacts…"}
      searchPlaceholder="Search by name, email, or ID…"
      emptyText={isFetching ? "Loading contacts…" : "No contacts found."}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}

function EmployeeTargetCombobox({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: Omit<KbRecordTargetComboboxProps, "targetType">) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: employeesRaw, isFetching } = useHrEmployees({
    search: debouncedSearch || undefined,
    limit: 50,
  });

  const employees = useMemo(() => normalizeEmployees(employeesRaw), [employeesRaw]);

  const options = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    return employees
      .filter((employee) => {
        if (!q) return true;
        return (
          employee.id.toLowerCase().includes(q) ||
          (employee.name?.toLowerCase().includes(q) ?? false) ||
          employee.email.toLowerCase().includes(q) ||
          (employee.employeeId?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 50)
      .map((employee) => ({
        value: employee.id,
        label: employee.name ?? employee.email,
        sublabel: employee.designation ?? employee.email,
      }));
  }, [employees, debouncedSearch]);

  const handleSearchChange = useCallback((q: string) => setSearch(q), []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? "Search employees…"}
      searchPlaceholder="Search by name, email, or ID…"
      emptyText={isFetching ? "Loading employees…" : "No employees found."}
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}

function ProjectTicketTargetCombobox({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: Omit<KbRecordTargetComboboxProps, "targetType">) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: tickets = [], isFetching } = useTicketSearch(debouncedSearch, {
    enabled: debouncedSearch.trim().length > 0,
  });

  const options = useMemo(
    () =>
      tickets.slice(0, 50).map((ticket) => ({
        value: String(ticket.id),
        label: `${formatTicketKey(ticket.projectKey, ticket.ticketNumber)} · ${ticket.title}`,
        sublabel: ticket.projectName,
      })),
    [tickets],
  );

  const handleSearchChange = useCallback((q: string) => setSearch(q), []);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? "Search project tickets…"}
      searchPlaceholder="Search by key or title…"
      emptyText={
        isFetching
          ? "Searching tickets…"
          : debouncedSearch.trim()
            ? "No tickets found."
            : "Type to search tickets…"
      }
      disabled={disabled}
      className={className}
      onSearchChange={handleSearchChange}
    />
  );
}

export function KbRecordTargetCombobox({
  targetType,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: KbRecordTargetComboboxProps) {
  if (!targetType) {
    return (
      <Combobox
        options={[]}
        value=""
        onChange={() => undefined}
        placeholder="Select record type first"
        disabled
        className={className}
      />
    );
  }

  switch (targetType) {
    case "crm_lead":
      return (
        <LeadTargetCombobox
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      );
    case "crm_deal":
      return (
        <DealTargetCombobox
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      );
    case "crm_contact":
      return (
        <ContactTargetCombobox
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      );
    case "project":
      return (
        <ProjectCombobox
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? "Search projects…"}
          disabled={disabled}
          className={className}
        />
      );
    case "project_ticket":
      return (
        <ProjectTicketTargetCombobox
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      );
    case "support_ticket":
      return (
        <SupportTicketCombobox
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? "Search support tickets…"}
          disabled={disabled}
          className={className}
        />
      );
    case "hr_employee":
      return (
        <EmployeeTargetCombobox
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      );
    default:
      return (
        <Combobox
          options={[]}
          value={value}
          onChange={onChange}
          placeholder="Unsupported record type"
          disabled
          className={className}
        />
      );
  }
}
