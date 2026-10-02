"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import { useHrEmployees } from "@/hooks/api/hr/employee-list";
import { getUserDisplayName } from "@/lib/person-display";

export const PEOPLE_SEARCH_MIN_LENGTH = 2;
export const PEOPLE_SEARCH_LIMIT = 10;
export const PEOPLE_SEARCH_INTEGRITY_MESSAGE =
  "Search failed integrity check — showing unfiltered. Report ref HRMS-SEARCH-001.";

export interface PalettePerson {
  id: string;
  name: string;
  subtitle: string;
  href: string;
}

export interface PalettePeopleSearch {
  people: PalettePerson[];
  canSearchPeople: boolean;
  isSearching: boolean;
  isError: boolean;
}

const EMPTY_PEOPLE: PalettePerson[] = [];

export function usePalettePeopleSearch(query: string): PalettePeopleSearch {
  const canSearchPeople = useCan("hr:employees:view");
  const trimmed = query.trim();
  const enabled = canSearchPeople && trimmed.length >= PEOPLE_SEARCH_MIN_LENGTH;

  const { data, isFetching, isError } = useHrEmployees(
    { search: trimmed, limit: PEOPLE_SEARCH_LIMIT, isActive: "all" },
    { enabled },
  );

  const people = useMemo(() => {
    if (!enabled) return EMPTY_PEOPLE;
    return (data?.data ?? []).map((employee) => ({
      id: employee.id,
      name: getUserDisplayName(employee),
      subtitle: employee.designation ?? employee.email,
      href: `/hr/employees/${employee.id}`,
    }));
  }, [enabled, data]);

  return {
    people,
    canSearchPeople,
    isSearching: enabled && isFetching,
    isError: enabled && isError,
  };
}
