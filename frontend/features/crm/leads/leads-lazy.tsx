"use client";

import dynamic from "next/dynamic";
import {
  LeadsBoardFallback,
  LeadsOverlayFallback,
  LeadsSheetFallback,
} from "./leads-lazy-fallbacks";


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
