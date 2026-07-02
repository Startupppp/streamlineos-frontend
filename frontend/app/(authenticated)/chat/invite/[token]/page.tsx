import { Metadata } from "next";
import { ChatInviteJoinPage } from "@/features/chat/chat-invite-join-page";

export const metadata: Metadata = {
  title: "Join Channel | StreamlineOS",
};

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ChatInviteJoinPage token={token} />;
}
