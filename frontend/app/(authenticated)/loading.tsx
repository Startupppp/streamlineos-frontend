import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

const HEADER_TILES = [1, 2, 3, 4];
const BODY_ROWS = [1, 2, 3, 4, 5, 6];

/**
 * HRMS-E2E-028. Opening `/hr/employees` or `/hr/onboarding` as a member or a
 * manager showed the previous page's Time Off content for a moment before the
 * access-denied redirect landed — content from a section they were leaving,
 * under a URL they are not allowed to see.
 *
 * The denial is a *server* redirect, not a rendered state:
 * `app/(authenticated)/hr/layout.tsx` awaits `enforceRouteAccess("/hr")`, which
 * ends in `redirect("/access-denied?…")`. During a client navigation React keeps
 * the previously committed tree painted until the server answers, and there was
 * no Suspense boundary above that layout to replace it with.
 *
 * `hr/loading.tsx` does not cover it. A `loading.tsx` is the fallback for its
 * segment's *children*, so it sits below `hr/layout.tsx` and fires only once the
 * gate has already passed — which is why `/hr/leaves → /hr/employees` never
 * flashed, and `/me/time-off → /hr/employees` did. The boundary that covers the
 * gating layout has to live at the parent segment, and this group had none:
 * 28 of its 30 child segments carried one, the group itself did not.
 *
 * Deliberately generic, and deliberately a skeleton. It stands in for any
 * product, so it names nothing. And it renders no denial — a permitted person
 * sees skeleton then content, a denied one sees skeleton then `/access-denied`.
 * Rendering a refusal here instead would be FE-42 in reverse: claiming an answer
 * before the answer exists.
 *
 * It fires only when the segment directly under `(authenticated)` changes. Every
 * in-product move resolves against its own closer boundary and is untouched, so
 * this is not a spinner on every navigation.
 *
 * The flash itself is not testable in jsdom (FE-123) — there is no Next router,
 * no RSC transition and no paint — so what is asserted elsewhere is that the
 * boundary exists, and the real check is a browser one.
 */
export default function AuthenticatedSegmentLoading() {
  return (
    <PageWrapper title="Loading" subtitle="Opening this section">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HEADER_TILES.map((tile) => (
            <Skeleton key={tile} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          {BODY_ROWS.map((row) => (
            <Skeleton key={row} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
