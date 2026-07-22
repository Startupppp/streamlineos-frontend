import { z } from "zod";

export const gitConnectionSchema = z.object({
  provider: z.enum(["github", "gitlab", "bitbucket"]),
  repoUrl: z.string().min(1, "Repository URL is required"),
  repoName: z.string(),
});

export type GitConnectionFormValues = z.infer<typeof gitConnectionSchema>;
