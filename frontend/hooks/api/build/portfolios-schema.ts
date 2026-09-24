import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const portfolioStatusContract = z.enum(["active", "on_hold", "completed", "archived"]);
const portfolioHealthContract = z.enum(["on_track", "at_risk", "off_track"]);
const projectStatusContract = z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]);

const portfolioRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: portfolioStatusContract,
  health: portfolioHealthContract.nullable(),
  strategicGoal: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export { portfolioRowContract };

const portfolioListItemContract = portfolioRowContract.omit({ deletedAt: true }).extend({
  projectCount: z.number().int(),
});

export const portfolioPageContract = cursorPageContract(portfolioListItemContract);

const linkedProjectContract = z.object({
  id: z.number().int(),
  name: z.string(),
  key: z.string(),
  status: projectStatusContract,
  openCount: z.number().int(),
  doneCount: z.number().int(),
});

const linkedProgramContract = z.object({
  id: z.number().int(),
  name: z.string(),
  status: portfolioStatusContract,
});

export const portfolioDetailContract = portfolioRowContract.extend({
  projects: cursorPageContract(linkedProjectContract),
  programs: cursorPageContract(linkedProgramContract),
});

export const programRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  portfolioId: z.number().int().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: portfolioStatusContract,
  health: portfolioHealthContract.nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const programListItemContract = programRowContract.omit({ deletedAt: true }).extend({
  projectCount: z.number().int(),
});

export const programPageContract = cursorPageContract(programListItemContract);

export const programDetailContract = programRowContract.extend({
  projects: cursorPageContract(
    z.object({
      id: z.number().int(),
      name: z.string(),
      key: z.string(),
      status: projectStatusContract,
      addedAt: z.string(),
    }),
  ),
});

export const portfoliosSuccessContract = z.object({ success: z.literal(true) });
