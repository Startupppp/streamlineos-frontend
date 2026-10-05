import { z } from "zod";

export const slackConnectionSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  teamName: z.string().optional(),
  signingSecret: z.string().min(1, "Signing secret is required"),
  botToken: z.string().min(1, "Bot token is required"),
  defaultChannelId: z.string().optional(),
});

export type SlackConnectionFormValues = z.infer<typeof slackConnectionSchema>;
