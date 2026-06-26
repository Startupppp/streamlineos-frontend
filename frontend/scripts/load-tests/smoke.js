import { sleep } from "k6";
import { getProfileOptions } from "./lib/config.js";
import { apiGet, publicGet, assertOk } from "./lib/http.js";

const profile = getProfileOptions();

export const options = {
  stages: profile.stages,
  thresholds: profile.thresholds,
  tags: { suite: "smoke" },
};

export default function smokeTest() {
  const health = publicGet("/health", { module: "smoke", endpoint: "health" });
  assertOk(health, "health");

  const hr = apiGet("/hr/dashboard/metrics", { module: "smoke", endpoint: "hr_metrics" });
  assertOk(hr, "hr_metrics");

  const recruitment = apiGet("/hr/recruitment/stats", {
    module: "smoke",
    endpoint: "recruitment_stats",
  });
  assertOk(recruitment, "recruitment_stats");

  const chat = apiGet("/chat/channels", { module: "smoke", endpoint: "chat_channels" });
  assertOk(chat, "chat_channels");

  sleep(1);
}
