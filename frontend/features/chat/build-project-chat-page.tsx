"use client";

import { RecordConversationPage } from "./record-conversation-page";

interface ProjectChatPageProps {
  projectId: string;
}

export function BuildProjectChatPage({ projectId }: ProjectChatPageProps) {
  return (
    <RecordConversationPage
      entityType="project"
      entityId={projectId}
      title="Chat"
      subtitle="The conversation for this project"
      emptyTitle="No chat channel linked"
      emptyDescriptionWrite="This project does not have an associated chat channel yet. Create one to start the conversation."
      emptyDescriptionReadOnly="This project does not have an associated chat channel yet. Ask a project admin to link one from the project settings."
    />
  );
}
