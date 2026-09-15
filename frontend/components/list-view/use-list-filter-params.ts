"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { currentSearchParams } from "@/lib/current-search-params";
import {
  categoryParams,
  countActiveCategories,
  DEFAULT_PAGE_PARAM,
  DEFAULT_SEARCH_DEBOUNCE_MS,
  DEFAULT_SEARCH_PARAM,
  type FilterCategorySpec,
  type FilterValues,
  type ListFilterSpec,
} from "./list-filter-spec";

export interface ListFilterParams {
  values: FilterValues;
  search: string;
  localSearch: string;
  page: number;
  activeFilterCount: number;
  setSearch: (value: string) => void;
  setPage: (page: number) => void;
  toggle: (categoryKey: string, value: string) => void;
  setAt: (categoryKey: string, index: number, value: string) => void;
  remove: (categoryKey: string, value: string) => void;
  clearCategory: (categoryKey: string) => void;
  clearAll: () => void;
}

function parseMulti(param: string): string[] {
  return param.split(",").filter(Boolean);
}

function readCategory(
  category: FilterCategorySpec,
  read: (param: string) => string,
): string[] {
  if (category.arity === "range") return category.params.map(read);
  const first = category.params[0];
  const raw = first ? read(first) : "";
  if (category.arity === "multi") return parseMulti(raw);
  return raw ? [raw] : [];
}

export function useListFilterParams(spec: ListFilterSpec): ListFilterParams {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const searchParamName = spec.searchParam ?? DEFAULT_SEARCH_PARAM;
  const pageParamName = spec.pageParam ?? DEFAULT_PAGE_PARAM;
  const debounceMs = spec.searchDebounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS;

  const queryString = searchParams.toString();
  const search = searchParams.get(searchParamName) ?? "";

  const values = useMemo<FilterValues>(() => {
    const params = new URLSearchParams(queryString);
    const read = (param: string): string => params.get(param) ?? "";
    const next: Record<string, string[]> = {};
    for (const category of spec.categories)
      next[category.key] = readCategory(category, read);
    return next;
  }, [queryString, spec]);

  const activeFilterCount = useMemo(
    () => countActiveCategories(spec, values),
    [spec, values],
  );

  const navigate = useCallback(
    (apply: (params: URLSearchParams) => void, keepPage = false) => {
      startTransition(() => {
        const params = currentSearchParams(searchParams);
        apply(params);
        if (!keepPage) params.delete(pageParamName);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname, searchParams, pageParamName],
  );

  const page = Math.max(1, Number(searchParams.get(pageParamName) ?? "1") || 1);

  const setPage = useCallback(
    (next: number) => {
      navigate((params) => {
        if (next <= 1) params.delete(pageParamName);
        else params.set(pageParamName, String(next));
      }, true);
    },
    [navigate, pageParamName],
  );

  const categoryFor = useCallback(
    (categoryKey: string): FilterCategorySpec | undefined =>
      spec.categories.find((entry) => entry.key === categoryKey),
    [spec],
  );

  const writeParam = useCallback(
    (params: URLSearchParams, param: string, value: string) => {
      if (value) params.set(param, value);
      else params.delete(param);
    },
    [],
  );

  const setValues = useCallback(
    (categoryKey: string, next: readonly string[]) => {
      const category = categoryFor(categoryKey);
      if (!category) return;
      navigate((params) => {
        if (category.arity === "range") {
          category.params.forEach((param, index) =>
            writeParam(params, param, next[index] ?? ""),
          );
          return;
        }
        const first = category.params[0];
        if (!first) return;
        writeParam(
          params,
          first,
          category.arity === "multi" ? next.join(",") : (next[0] ?? ""),
        );
      });
    },
    [categoryFor, navigate, writeParam],
  );

  const toggle = useCallback(
    (categoryKey: string, value: string) => {
      const category = categoryFor(categoryKey);
      if (!category) return;
      const current = values[categoryKey] ?? [];
      if (category.arity === "multi") {
        setValues(
          categoryKey,
          current.includes(value)
            ? current.filter((entry) => entry !== value)
            : [...current, value],
        );
        return;
      }
      setValues(categoryKey, current[0] === value ? [] : [value]);
    },
    [categoryFor, setValues, values],
  );

  const setAt = useCallback(
    (categoryKey: string, index: number, value: string) => {
      const category = categoryFor(categoryKey);
      if (!category) return;
      const next = category.params.map((_, position) =>
        position === index ? value : (values[categoryKey]?.[position] ?? ""),
      );
      setValues(categoryKey, next);
    },
    [categoryFor, setValues, values],
  );

  const remove = useCallback(
    (categoryKey: string, value: string) => {
      const current = values[categoryKey] ?? [];
      setValues(
        categoryKey,
        current.filter((entry) => entry !== value),
      );
    },
    [setValues, values],
  );

  const clearCategory = useCallback(
    (categoryKey: string) => {
      const category = categoryFor(categoryKey);
      if (!category) return;
      setValues(
        categoryKey,
        category.arity === "range" ? category.params.map(() => "") : [],
      );
    },
    [categoryFor, setValues],
  );

  const clearAll = useCallback(() => {
    navigate((params) => {
      for (const param of categoryParams(spec)) params.delete(param);
    });
  }, [navigate, spec]);

  const [searchDraft, setSearchDraft] = useState(() => ({
    urlValue: search,
    value: search,
  }));
  const localSearch =
    searchDraft.urlValue === search ? searchDraft.value : search;
  const setLocalSearch = useCallback(
    (value: string) => setSearchDraft({ urlValue: search, value }),
    [search],
  );
  const debouncedSearch = useDebouncedValue(localSearch, debounceMs);
  const previousDebounced = useRef(debouncedSearch);

  const commitSearch = useCallback(
    (value: string) => {
      navigate((params) => writeParam(params, searchParamName, value));
    },
    [navigate, searchParamName, writeParam],
  );

  useEffect(() => {
    if (debouncedSearch === previousDebounced.current) return;
    previousDebounced.current = debouncedSearch;
    if (debouncedSearch !== search) commitSearch(debouncedSearch);
  }, [debouncedSearch, search, commitSearch]);

  return useMemo(
    () => ({
      values,
      search,
      localSearch,
      page,
      activeFilterCount,
      setSearch: setLocalSearch,
      setPage,
      toggle,
      setAt,
      remove,
      clearCategory,
      clearAll,
    }),
    [
      values,
      search,
      localSearch,
      page,
      activeFilterCount,
      setLocalSearch,
      setPage,
      toggle,
      setAt,
      remove,
      clearCategory,
      clearAll,
    ],
  );
}
