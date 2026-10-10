"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSourceOverride } from "./use-source-override";

export function useQueryParamOpen(param: string, value = "1") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const fromUrl = searchParams.get(param) === value;

  const [open, setOpenState] = useSourceOverride(searchParams, fromUrl);

  const clearParam = useCallback(() => {
    if (!searchParams.get(param)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }, [param, pathname, router, searchParams, startTransition]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (!next) clearParam();
    },
    [clearParam, setOpenState],
  );

  const setOpen = useCallback(() => {
    setOpenState(true);
  }, [setOpenState]);

  return { open, onOpenChange, setOpen, clearParam, fromUrl };
}
