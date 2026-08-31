"use client";

import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
  type InfiniteData,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { reauthorizeAblyClients } from "@/lib/ably";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useRealtimePollInterval } from "@/hooks/common/use-realtime-poll-interval";
import type {
  Channel,
  ChatNotificationPreference,
  Message,
  MessagesPage,
  OnlineUser,
  OrgUser,
  CreateDMInput,
  CreateGroupChannelInput,
  CreatePublicChannelInput,
  CreatePrivateChannelInput,
  UpdateChannelInput,
  SendMessageInput,
  EditMessageInput,
  AttachmentInput,
  PinnedMessage,
  PublicChannel,
  ThreadPage,
  SearchMessagesResult,
  SearchChannelResult,
  SearchUserResult,
  SavedMessagesPage,
} from "@/types/chat";

export function refreshRealtimeCapability(): void {
  void reauthorizeAblyClients();
}

