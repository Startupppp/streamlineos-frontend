import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const kbRecordLinkContract = z.object({
  id: z.number().int(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  label: z.string().nullable(),
});

export const kbRecordLinkListContract = cursorPageContract(kbRecordLinkContract);
export const kbRecordLinkSuccessContract = z.object({ success: z.boolean() });
export const kbRecordLinkSingleContract = kbRecordLinkContract;
