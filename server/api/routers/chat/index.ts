import { createTRPCRouter } from "../../trpc";
import { channelRouter } from "./channel";
import { messageRouter } from "./message";
import { presenceRouter } from "./presence";

export const chatRouter = createTRPCRouter({
  channel: channelRouter,
  message: messageRouter,
  presence: presenceRouter,
});
