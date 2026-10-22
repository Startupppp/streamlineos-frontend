import type { RecordLayout } from "../../layout";
import { SALES_REP_FIELDS } from "./rep-performance-layout";

export const TEAM_LEADERBOARD_LAYOUT: RecordLayout = {
  key: "crm:team-leaderboard",
  singular: "Leaderboard rep",
  plural: "Leaderboard",
  titleField: "name",
  fields: SALES_REP_FIELDS,
  list: {
    searchPlaceholder: "Search the leaderboard…",
    columns: [
      { field: "name", primary: true },
      { field: "rank", width: "w-16 shrink-0" },
      { field: "count", width: "w-20 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Rep", fields: ["name", "rank"] },
      { title: "Result", fields: ["count"] },
    ],
  },
  form: { sections: [] },
};
