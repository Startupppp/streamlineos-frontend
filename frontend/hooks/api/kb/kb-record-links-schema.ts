import { z } from "zod";

const kbRecordLinkContract = z.object({
  id: z.number().int(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  label: z.string().nullable(),
});

export const kbRecordLinkListContract = z.array(kbRecordLinkContract);
export const kbRecordLinkSuccessContract = z.object({ success: z.boolean() });
export const kbRecordLinkSingleContract = kbRecordLinkContract;
