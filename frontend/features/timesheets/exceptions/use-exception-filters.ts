"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  EXCEPTION_RULE_LABEL,
  EXCEPTION_SEVERITY_LABEL,
  EXCEPTION_STATUS_LABEL,
  type ExceptionRule,
  type ExceptionSeverity,
  type ExceptionStatus,
} from "@/features/timesheets/exception-types";

export const ALL = "all";

export const DEFAULT_STATUS: ExceptionStatus = "OPEN";

export interface ExceptionFilterState {
  status: string;
  severity: string;
  rule: string;
  userId: string;
}

export interface ExceptionFilters extends ExceptionFilterState {
  statusParam: ExceptionStatus | undefined;
  severityParam: ExceptionSeverity | undefined;
  ruleParam: ExceptionRule | undefined;
  userIdParam: string | undefined;
  activeCount: number;
  isDefault: boolean;
  setStatus: (value: string) => void;
  setSeverity: (value: string) => void;
  setRule: (value: string) => void;
  setUserId: (value: string) => void;
  clear: () => void;
}

function isExceptionStatus(value: string): value is ExceptionStatus {
  return value in EXCEPTION_STATUS_LABEL;
}

function isExceptionSeverity(value: string): value is ExceptionSeverity {
  return value in EXCEPTION_SEVERITY_LABEL;
}

function isExceptionRule(value: string): value is ExceptionRule {
  return value in EXCEPTION_RULE_LABEL;
}

export function useExceptionFilters(): ExceptionFilters {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? DEFAULT_STATUS;
  const severity = searchParams.get("severity") ?? ALL;
  const rule = searchParams.get("rule") ?? ALL;
  const userId = searchParams.get("userId") ?? ALL;

  const setParam = useCallback(
    (key: string, value: string, defaultValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === defaultValue) params.delete(key);
      else params.set(key, value);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setStatus = useCallback(
    (value: string) => setParam("status", value, DEFAULT_STATUS),
    [setParam],
  );
  const setSeverity = useCallback(
    (value: string) => setParam("severity", value, ALL),
    [setParam],
  );
  const setRule = useCallback((value: string) => setParam("rule", value, ALL), [setParam]);
  const setUserId = useCallback(
    (value: string) => setParam("userId", value, ALL),
    [setParam],
  );

  const clear = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["status", "severity", "rule", "userId"]) params.delete(key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  return useMemo(() => {
    const statusParam = isExceptionStatus(status) ? status : undefined;
    const severityParam = isExceptionSeverity(severity) ? severity : undefined;
    const ruleParam = isExceptionRule(rule) ? rule : undefined;
    const userIdParam = userId === ALL ? undefined : userId;
    const isDefault =
      status === DEFAULT_STATUS && severity === ALL && rule === ALL && userId === ALL;
    const activeCount =
      (status === DEFAULT_STATUS ? 0 : 1) +
      (severity === ALL ? 0 : 1) +
      (rule === ALL ? 0 : 1) +
      (userId === ALL ? 0 : 1);

    return {
      status,
      severity,
      rule,
      userId,
      statusParam,
      severityParam,
      ruleParam,
      userIdParam,
      activeCount,
      isDefault,
      setStatus,
      setSeverity,
      setRule,
      setUserId,
      clear,
    };
  }, [status, severity, rule, userId, setStatus, setSeverity, setRule, setUserId, clear]);
}
