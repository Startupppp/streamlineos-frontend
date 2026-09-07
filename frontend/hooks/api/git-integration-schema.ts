import { z } from "zod";

const wireDate = () => z.string();

const gitConnectionItemSchema = z.object({
  id: z.number().int(),
  provider: z.string(),
  projectId: z.string().nullable(),
  repoUrl: z.string(),
  repoName: z.string().nullable(),
  isActive: z.boolean(),
  maskedSecret: z.string(),
  webhookUrl: z.string(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

export const gitConnectionListContract = z.array(gitConnectionItemSchema);

export const gitConnectionCreateContract = z.object({
  id: z.number().int(),
  provider: z.string(),
  projectId: z.string().nullable(),
  repoUrl: z.string(),
  repoName: z.string().nullable(),
  isActive: z.boolean(),
  webhookUrl: z.string(),
  webhookSecret: z.string(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

export const gitConnectionUpdateContract = z.object({
  id: z.number().int(),
  provider: z.string(),
  projectId: z.string().nullable(),
  repoUrl: z.string(),
  repoName: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

export const gitConnectionDeleteContract = z.object({ success: z.literal(true) });

const ticketGitLinkSchema = z.object({
  id: z.number().int(),
  provider: z.enum(["github", "gitlab", "bitbucket"]),
  refType: z.enum(["commit", "pull_request", "branch"]),
  externalId: z.string(),
  title: z.string().nullable(),
  url: z.string().nullable(),
  author: z.string().nullable(),
  status: z.string().nullable(),
  createdAt: wireDate(),
});

export const ticketGitLinksContract = z.array(ticketGitLinkSchema);
