import type { RecordLayout } from "../../layout";
import { SALES_REP_FIELDS } from "./rep-performance-layout";

/**
 * The leaderboard, as data.
 *
 * The same rep row as `REP_PERFORMANCE_LAYOUT`, asked a different question. The
 * analytics table asks who is working and shows calls and score; this asks who
 * is winning and shows revenue and the rate that produced it.
 *
 * A separate key rather than a second view of one, because an arrangement is
 * stored against a key: a tenant who drops `score` from the leaderboard has said
 * nothing about the analytics table, and applying it there would be one screen
 * quietly editing another. The fields themselves are imported rather than
 * restated — the two may disagree about which columns to show and must not
 * disagree about what a column means.
 *
 * The medal tinting on the first three ranks is gone rather than translated. It
 * painted first and third the same amber and second the same grey as tenth, so
 * it was decoration reading as a status; the ordering already says who is first.
 */
export const TEAM_LEADERBOARD_LAYOUT: RecordLayout = {
  key: "crm:team-leaderboard",
  singular: "Leaderboard rep",
  plural: "Leaderboard",
  titleField: "name",
  fields: SALES_REP_FIELDS,
  list: {
    searchPlaceholder: "Search the leaderboard…",
    columns: [
      { field: "name", primary: true, sortable: true },
      { field: "rank", width: "w-16 shrink-0" },
      { field: "leadsAssigned", sortable: true, width: "w-20 shrink-0" },
      { field: "leadsConverted", sortable: true, width: "w-24 shrink-0" },
      { field: "totalRevenue", sortable: true, width: "w-32 shrink-0" },
      { field: "conversionRate", sortable: true, width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Rep", fields: ["name", "rank"] },
      { title: "Result", fields: ["leadsAssigned", "leadsConverted", "conversionRate"] },
      { title: "Return", fields: ["totalRevenue", "score"] },
    ],
  },
  form: { sections: [] },
};
