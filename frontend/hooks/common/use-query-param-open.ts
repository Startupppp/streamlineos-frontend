"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useQueryParamOpen(param: string, value = "1") {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const fromUrl = searchParams.get(param) === value;
  const [manualOpen, setManualOpen] = useState(false);
  const open = fromUrl || manualOpen;

  const clearParam = useCallback(() => {
    if (!searchParams.get(param)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }, [param, pathname, router, searchParams, startTransition]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setManualOpen(next);
      if (!next) clearParam();
    },
    [clearParam],
  );

  const setOpen = useCallback(() => {
    setManualOpen(true);
  }, []);

  return { open, onOpenChange, setOpen, clearParam, fromUrl };
}
