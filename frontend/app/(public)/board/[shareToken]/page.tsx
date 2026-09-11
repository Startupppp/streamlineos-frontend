import type { Metadata } from "next";
import { PublicBoardView } from "@/features/build/whiteboard/public-board-view";

export const metadata: Metadata = {
  title: "Shared board",
};

type Props = {
  params: Promise<{ shareToken: string }>;
};

export default async function SharedBoardPage({ params }: Props) {
  const { shareToken } = await params;
  return <PublicBoardView shareToken={shareToken} />;
}
