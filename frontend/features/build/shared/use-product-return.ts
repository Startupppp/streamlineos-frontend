"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PRODUCT_RETURN_PARAM,
  resolveProductReturnHref,
} from "./product-return-href";

export function useProductReturn(fallbackHref: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnHref = resolveProductReturnHref(
    searchParams.get(PRODUCT_RETURN_PARAM),
  );

  const handleBack = useCallback(() => {
    if (returnHref) {
      router.push(returnHref);
    } else if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }, [router, returnHref, fallbackHref]);

  return { returnHref, handleBack };
}
