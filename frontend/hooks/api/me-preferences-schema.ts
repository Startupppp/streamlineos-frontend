import { z } from "zod";
import { LANGUAGES } from "@/lib/i18n/languages";

export const myPreferencesContract = z.object({ language: z.enum(LANGUAGES) });

export const updateMyPreferencesContract = z.object({ success: z.literal(true) });
