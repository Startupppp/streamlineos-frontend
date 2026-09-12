import type { ReactNode } from "react";

/**
 * The RF surface is a scanner screen, not a page.
 *
 * `SuccessChecklist` portals its mobile UI into `#mobile-header-checklist-slot`
 * in the global header, and at 375px the expanded panel lands on top of the RF
 * header: measured on a real viewport, "Getting Started" occupied y 52-272 while
 * the task heading sat at y 68-88, covering the task number and the back control
 * an operator needs while holding the device in one hand.
 *
 * Hiding the portal's target is a workaround, and the honest fix is for the
 * shell to stop floating onboarding over a device surface. That belongs to
 * `components/layout/dashboard-shell.tsx`, which this module does not own — so
 * this suppresses it from the RF side instead, and only while RF is mounted:
 * the rule unmounts with the layout, so every other route is untouched.
 */
const HIDE_ONBOARDING_PORTAL = "#mobile-header-checklist-slot{display:none}";

export default function InventoryRfLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{HIDE_ONBOARDING_PORTAL}</style>
      {children}
    </>
  );
}
