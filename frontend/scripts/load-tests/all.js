import { sleep } from "k6";
import { getProfileOptions, getPacedSleepSeconds, getAllScenarioStages, getAllScenarioStartTime, WRITE_ENABLED } from "./lib/config.js";
import { apiGet, apiPost, assertOk, assertSetupOk, parseJson, firstId } from "./lib/http.js";
import {
  HR_READ_ENDPOINTS,
  RECRUITMENT_READ_ENDPOINTS,
  recruitmentDetailEndpoints,
  CHAT_READ_ENDPOINTS,
  chatDetailEndpoints,
} from "./lib/endpoints.js";

const profile = getProfileOptions();
const scenarioStages = getAllScenarioStages();
const hrPace = getPacedSleepSeconds(1, "api-default");
const recruitmentPace = getPacedSleepSeconds(2, "api-default");
const chatPace = getPacedSleepSeconds(3, "chat");

export const options = {
  thresholds: profile.thresholds,
  scenarios: {
    hr_modules: {
      executor: "ramping-vus",
      exec: "hrScenario",
      stages: scenarioStages,
      tags: { suite: "all", module: "hr" },
    },
    recruitment_hub: {
      executor: "ramping-vus",
      exec: "recruitmentScenario",
      stages: scenarioStages,
      startTime: getAllScenarioStartTime(1),
      tags: { suite: "all", module: "recruitment" },
    },
    chat: {
      executor: "ramping-vus",
      exec: "chatScenario",
      stages: scenarioStages,
      startTime: getAllScenarioStartTime(2),
      tags: { suite: "all", module: "chat" },
    },
  },
};

export function setup() {
  const candidatesRes = apiGet("/hr/recruitment/candidates?limit=5");
  assertSetupOk(candidatesRes, "setup_candidates");
  const jobsRes = apiGet("/hr/recruitment/jobs?limit=5");
  assertSetupOk(jobsRes, "setup_jobs");
  const interviewsRes = apiGet("/hr/recruitment/interviews?limit=5");
  assertSetupOk(interviewsRes, "setup_interviews");
  const channelsRes = apiGet("/chat/channels");
  assertSetupOk(channelsRes, "setup_channels");

  return {
    candidateId: firstId(parseJson(candidatesRes)),
    jobId: firstId(parseJson(jobsRes)),
    interviewId: firstId(parseJson(interviewsRes)),
    channelId: firstId(parseJson(channelsRes)),
  };
}

export function hrScenario() {
  const pick = HR_READ_ENDPOINTS[__ITER % HR_READ_ENDPOINTS.length];
  const res = apiGet(pick.path, { module: "hr", endpoint: pick.name });
  assertOk(res, pick.name);
  sleep(hrPace);
}

export function recruitmentScenario(ids) {
  const staticPick = RECRUITMENT_READ_ENDPOINTS[__ITER % RECRUITMENT_READ_ENDPOINTS.length];
  const staticRes = apiGet(staticPick.path, { module: "recruitment", endpoint: staticPick.name });
  assertOk(staticRes, staticPick.name);

  const details = recruitmentDetailEndpoints(ids);
  if (details.length > 0) {
    const detailPick = details[__ITER % details.length];
    const detailRes = apiGet(detailPick.path, { module: "recruitment", endpoint: detailPick.name });
    assertOk(detailRes, detailPick.name);
  }
  sleep(recruitmentPace);
}

export function chatScenario(ids) {
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
  }

  if (WRITE_ENABLED && ids.channelId && __ITER % 5 === 0) {
    apiPost("/chat/presence/heartbeat", {}, { module: "chat", endpoint: "chat_heartbeat" });
  }

  sleep(chatPace);
}
