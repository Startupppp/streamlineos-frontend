"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Shield,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  X,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHrEmployees } from "@/hooks/api/hr/employees";
import { useSimulateAccess } from "@/hooks/api/access/simulate";
import { getInitials } from "@/lib/format-utils";
import type { Employee } from "@/types/hr";
import type { DataScope } from "@/types/access";

const MODULE_LABELS: Record<string, string> = {
  hr: "Human Resources",
  crm: "CRM & Sales",
  projects: "Projects",
  settings: "Settings",
  reports: "Reports",
  accounting: "Accounting",
  dashboard: "Dashboards",
  kb: "Knowledge Base",
  inventory: "Inventory",
  support: "Support",
  self: "Self-Service",
  branch: "Branches",
  dm: "Digital Marketing",
  chat: "Chat",
};

const SCOPE_BADGE_VARIANT: Record<DataScope, "default" | "secondary" | "outline"> = {
  all: "default",
  team: "secondary",
  own: "outline",
  none: "outline",
};

function moduleOf(key: string): string {
  const idx = key.indexOf(":");
  return idx === -1 ? key : key.slice(0, idx);
}

function resourceOf(key: string): string {
  const parts = key.split(":");
  if (parts.length < 3) return key;
  return parts.slice(1, -1).join(":");
}

export default function SimulatePage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <SimulateContent />
    </DashboardGate>
  );
}

function SimulateContent() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const employeesQuery = useHrEmployees({ limit: 200 });
  const simulateQuery = useSimulateAccess(selectedEmployee?.id);

  const employees = useMemo<Employee[]>(() => {
    const data = employeesQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.data ?? [];
  }, [employeesQuery.data]);

  const grouped = useMemo(() => {
    if (!simulateQuery.data) return new Map<string, Array<{ key: string; scope: DataScope }>>();
    const map = new Map<string, Array<{ key: string; scope: DataScope }>>();
    for (const key of simulateQuery.data.permissions) {
      const mod = moduleOf(key);
      const scope = simulateQuery.data.scopes[key] ?? "all";
      const list = map.get(mod) ?? [];
      list.push({ key, scope });
      map.set(mod, list);
    }
    return map;
  }, [simulateQuery.data]);

  const handleSelectEmployee = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setSelectorOpen(false);
    setExpandedModules(new Set());
  }, []);

  const handleClearEmployee = useCallback(() => {
    setSelectedEmployee(null);
    setExpandedModules(new Set());
  }, []);

  const handleToggleModule = useCallback((mod: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) {
        next.delete(mod);
      } else {
        next.add(mod);
      }
      return next;
    });
  }, []);

  const handleRetry = useCallback(() => {
    void simulateQuery.refetch();
  }, [simulateQuery.refetch, simulateQuery]);

  return (
    <PageWrapper
      title="Permission Simulator"
      subtitle="View what a specific employee can do in the system"
    >
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-[320px] justify-between"
                    aria-label="Select employee"
                  >
                    {selectedEmployee ? (
                      <span className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarImage src={selectedEmployee.image ?? undefined} />
                          <AvatarFallback className="text-[9px]">
                            {getInitials(selectedEmployee.name ?? selectedEmployee.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">
                          {selectedEmployee.name ?? selectedEmployee.email}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Search className="h-4 w-4" />
                        <span className="text-sm">Select an employee…</span>
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employees…" />
                    <CommandList className="max-h-[240px]">
                      <CommandEmpty>No employees found.</CommandEmpty>
                      <CommandGroup>
                        {employees.map((employee) => (
                          <EmployeeCommandItem
                            key={employee.id}
                            employee={employee}
                            onSelect={handleSelectEmployee}
                          />
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedEmployee && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearEmployee}
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedEmployee && (
          <EmptySelectionState />
        )}

        {selectedEmployee && simulateQuery.isLoading && (
          <SimulateLoadingSkeleton />
        )}

        {selectedEmployee && simulateQuery.isError && (
          <SimulateErrorState onRetry={handleRetry} />
        )}

        {selectedEmployee && simulateQuery.data && (
          <SimulateResults
            employeeName={selectedEmployee.name ?? selectedEmployee.email}
            data={simulateQuery.data}
            grouped={grouped}
            expandedModules={expandedModules}
            onToggleModule={handleToggleModule}
          />
        )}
      </div>
    </PageWrapper>
  );
}

interface EmployeeCommandItemProps {
  employee: Employee;
  onSelect: (employee: Employee) => void;
}

function EmployeeCommandItem({ employee, onSelect }: EmployeeCommandItemProps) {
  const handleSelect = useCallback(() => onSelect(employee), [employee, onSelect]);

  return (
    <CommandItem onSelect={handleSelect} className="flex items-center gap-2 cursor-pointer">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={employee.image ?? undefined} />
        <AvatarFallback className="text-[9px]">
          {getInitials(employee.name ?? employee.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm truncate">{employee.name ?? employee.email}</p>
        {employee.designation && (
          <p className="text-[11px] text-muted-foreground truncate">{employee.designation}</p>
        )}
      </div>
    </CommandItem>
  );
}

function EmptySelectionState() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[320px]">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <User className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No employee selected</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
          Select an employee above to simulate and inspect their effective permissions
        </p>
      </div>
    </div>
  );
}

function SimulateLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2 pt-4">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface SimulateErrorStateProps {
  onRetry: () => void;
}

function SimulateErrorState({ onRetry }: SimulateErrorStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[240px]">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium text-foreground">Failed to load permissions</p>
        <p className="text-xs text-muted-foreground mt-1">Something went wrong while fetching this employee&apos;s access</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    </div>
  );
}

interface SimulateResultsProps {
  employeeName: string;
  data: { userId: string; permissions: string[]; scopes: Record<string, DataScope>; isOrgOwner: boolean };
  grouped: Map<string, Array<{ key: string; scope: DataScope }>>;
  expandedModules: Set<string>;
  onToggleModule: (mod: string) => void;
}

function SimulateResults({
  employeeName,
  data,
  grouped,
  expandedModules,
  onToggleModule,
}: SimulateResultsProps) {
  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex items-center gap-2 shrink-0">
        <Shield className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">
          {data.permissions.length} permission{data.permissions.length !== 1 ? "s" : ""} for{" "}
          <span className="font-semibold">{employeeName}</span>
        </p>
      </div>

      {data.permissions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[240px]">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No permissions</p>
            <p className="text-xs text-muted-foreground mt-1">
              This employee has no active permissions assigned
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1" type="auto">
          <div className="flex flex-col gap-2 pr-2">
            {Array.from(grouped.entries()).map(([mod, items]) => (
              <ModulePermissionGroup
                key={mod}
                mod={mod}
                items={items}
                isExpanded={expandedModules.has(mod)}
                onToggle={onToggleModule}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface ModulePermissionGroupProps {
  mod: string;
  items: Array<{ key: string; scope: DataScope }>;
  isExpanded: boolean;
  onToggle: (mod: string) => void;
}

function ModulePermissionGroup({ mod, items, isExpanded, onToggle }: ModulePermissionGroupProps) {
  const handleToggle = useCallback(() => onToggle(mod), [mod, onToggle]);
  const label = MODULE_LABELS[mod] ?? mod;

  return (
    <Card>
      <CardHeader
        className="pb-2 pt-3 px-4 cursor-pointer select-none"
        onClick={handleToggle}
      >
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {label}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-1.5 pr-4 font-medium w-full">Permission</th>
                  <th className="text-left py-1.5 pr-4 font-medium whitespace-nowrap">Resource</th>
                  <th className="text-left py-1.5 font-medium whitespace-nowrap">Scope</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ key, scope }) => (
                  <PermissionRow key={key} permKey={key} scope={scope} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface PermissionRowProps {
  permKey: string;
  scope: DataScope;
}

function PermissionRow({ permKey, scope }: PermissionRowProps) {
  const resource = resourceOf(permKey);

  return (
    <tr className="border-b border-border/30 last:border-0">
      <td className="py-1.5 pr-4 font-mono text-[10px] text-foreground">{permKey}</td>
      <td className="py-1.5 pr-4 text-muted-foreground">{resource}</td>
      <td className="py-1.5">
        <Badge
          variant={SCOPE_BADGE_VARIANT[scope]}
          className="text-[9px] px-1.5 py-0"
        >
          {scope}
        </Badge>
      </td>
    </tr>
  );
}
