"use client";

import type { z } from "zod";
import { lazyContract } from "@/lib/api-envelope";
import type { commentPermalinkContract as commentPermalinkContractDef } from "@/hooks/api/build/build-tickets-subresource-schema";

export const commentPermalinkLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.commentPermalinkContract),
);

export type CommentPermalinkData = z.infer<typeof commentPermalinkContractDef>;
