import { Metadata } from "next";
import { ChatInviteJoinPage } from "@/features/chat/chat-invite-join-page";

export const metadata: Metadata = {
  title: "Join Channel | StreamlineOS",
};

export default async function Page({
  params,
}: {
  params: Promise<{ inviteToken: string }>;
}) {
  const { inviteToken } = await params;
  return <ChatInviteJoinPage token={inviteToken} />;
}
