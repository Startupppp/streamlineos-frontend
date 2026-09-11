"use client";

import dynamic from "next/dynamic";
import {
  LeadsBoardFallback,
  LeadsOverlayFallback,
  LeadsSheetFallback,
} from "./leads-lazy-fallbacks";

/**
 * The pipeline's interaction-gated subtrees.
 *
 * The route opens on the table view, so the board, the funnel, both sheets and
 * the export dialog are all things a person asks for after the page has
 * painted. Kept behind `next/dynamic` so their libraries — @hello-pangea/dnd
 * for the board, react-hook-form and the record renderer for the two sheets,
 * react-day-picker for the export filters — are not in the route's first load.
 *
 * Every one of these is mounted conditionally by the page. A `next/dynamic`
 * boundary that is always rendered fetches its chunk on mount and saves nothing.
 */

export const LeadsKanban = dynamic(
  () => import("./leads-kanban").then((m) => ({ default: m.LeadsKanban })),
  { ssr: false, loading: () => <LeadsBoardFallback label="Loading pipeline board" /> },
);

export const LeadsFunnelView = dynamic(
  () => import("./leads-funnel-view").then((m) => ({ default: m.LeadsFunnelView })),
  { ssr: false, loading: () => <LeadsBoardFallback label="Loading funnel" /> },
);

export const LeadDetailSheet = dynamic(
  () => import("./lead-detail-sheet").then((m) => ({ default: m.LeadDetailSheet })),
  { ssr: false, loading: () => <LeadsSheetFallback label="Loading lead" /> },
);

export const CreateLeadSheet = dynamic(
  () => import("./create-lead-sheet").then((m) => ({ default: m.CreateLeadSheet })),
  { ssr: false, loading: () => <LeadsSheetFallback label="Loading new lead form" /> },
);

export const LeadExportDialog = dynamic(
  () => import("./lead-export-dialog").then((m) => ({ default: m.LeadExportDialog })),
  { ssr: false, loading: () => <LeadsOverlayFallback label="Loading export options" /> },
);
