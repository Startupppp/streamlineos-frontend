import { sleep } from "k6";
import { getProfileOptions, getPacedSleepSeconds, WRITE_ENABLED } from "./lib/config.js";
import { apiGet, apiPost, assertOk, assertSetupOk, parseJson, firstId } from "./lib/http.js";
import { CHAT_READ_ENDPOINTS, chatDetailEndpoints } from "./lib/endpoints.js";

const profile = getProfileOptions();
const pace = getPacedSleepSeconds(3, "chat");

export const options = {
  ...profile,
  tags: { suite: "chat" },
};

export function setup() {
  const channelsRes = apiGet("/chat/channels", {
    module: "chat",
    endpoint: "setup_channels",
  });
  assertSetupOk(channelsRes, "setup_channels");
  const channels = parseJson(channelsRes);
  return { channelId: firstId(channels) };
}

export default function chatLoadTest(ids) {
  const pick = CHAT_READ_ENDPOINTS[__ITER % CHAT_READ_ENDPOINTS.length];
  const res = apiGet(pick.path, { module: "chat", endpoint: pick.name });
  assertOk(res, pick.name);

  if (ids.channelId) {
    const details = chatDetailEndpoints(ids.channelId);
    const detailPick = details[__ITER % details.length];
    if (detailPick) {
      const detailRes = apiGet(detailPick.path, { module: "chat", endpoint: detailPick.name });
      assertOk(detailRes, detailPick.name);
    }

    if (__ITER % 3 === 0) {
      const pollRes = apiGet(
        `/chat/channels/${ids.channelId}/messages/poll?since=${encodeURIComponent(new Date(Date.now() - 60000).toISOString())}`,
        { module: "chat", endpoint: "chat_messages_poll" },
      );
      assertOk(pollRes, "chat_messages_poll");
    }
  }

  if (__ITER % 5 === 0) {
    const searchRes = apiGet("/chat/search?query=hello", {
      module: "chat",
      endpoint: "chat_search",
    });
    assertOk(searchRes, "chat_search");
  }

  if (WRITE_ENABLED && ids.channelId && __ITER % 10 === 0) {
    const heartbeatRes = apiPost("/chat/presence/heartbeat", {}, {
      module: "chat",
      endpoint: "chat_heartbeat",
    });
    assertOk(heartbeatRes, "chat_heartbeat");

    const readRes = apiPost(`/chat/channels/${ids.channelId}/read`, {}, {
      module: "chat",
      endpoint: "chat_mark_read",
    });
    assertOk(readRes, "chat_mark_read");
  }

  sleep(pace);
}
