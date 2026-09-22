import type { StatementDateFormat } from "@/types/accounting/accounting-banking";

export const DATE_FORMAT_SAMPLES: Readonly<
  Record<StatementDateFormat, { sample: string; meaning: string }>
> = {
  "YYYY-MM-DD": { sample: "2026-04-03", meaning: "means 3 April 2026" },
  "YYYY/MM/DD": { sample: "2026/04/03", meaning: "means 3 April 2026" },
  "DD/MM/YYYY": { sample: "03/04/2026", meaning: "means 3 April 2026" },
  "MM/DD/YYYY": { sample: "03/04/2026", meaning: "means 4 March 2026" },
  "DD-MM-YYYY": { sample: "03-04-2026", meaning: "means 3 April 2026" },
  "MM-DD-YYYY": { sample: "03-04-2026", meaning: "means 4 March 2026" },
  "DD.MM.YYYY": { sample: "03.04.2026", meaning: "means 3 April 2026" },
  "DD-MMM-YYYY": { sample: "03-Apr-2026", meaning: "means 3 April 2026" },
  "MMM DD, YYYY": { sample: "Apr 03, 2026", meaning: "means 3 April 2026" },
};
