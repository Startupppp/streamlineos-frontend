"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * The sidebar renders one `<Link>` per authorized nav route — 57 for finance,
 * 41 for inventory. App Router prefetches every one of those that is in the
 * viewport, and each speculative RSC request re-runs the `(authenticated)`
 * layout's session and permission reads on the backend. That is a lot of load
 * for routes the person is not going to open.
 *
 * Intent prefetch keeps the navigation fast without the fan-out: the link opts
 * out of viewport prefetch and asks for the route only once the pointer or
 * keyboard focus lands on it. Each href is requested at most once per mount.
 */
export function useNavIntentPrefetch() {
  const router = useRouter();
  const prefetched = useRef(new Set<string>());

  return useCallback(
    (href: string) => {
      if (!href || href.startsWith("http") || prefetched.current.has(href)) {
        return;
      }
      prefetched.current.add(href);
      router.prefetch(href);
    },
    [router],
  );
}
