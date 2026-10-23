import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

/** Reading column for Docs document surfaces — same horizontal chrome as PageWrapper. */
export const WIKI_DOCUMENT_COLUMN = cn(
  "mx-auto w-full min-w-0 max-w-4xl",
  PAGE_CHROME_X,
);

/** Full-width Docs spreadsheet chrome — same horizontal padding as other pages. */
export const WIKI_SPREADSHEET_COLUMN = cn("w-full min-w-0", PAGE_CHROME_X);
