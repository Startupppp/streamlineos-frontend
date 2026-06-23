import { sleep } from "k6";
import { getProfileOptions, getPacedSleepSeconds } from "./lib/config.js";
import { apiGet, assertOk, assertSetupOk, parseJson, firstId } from "./lib/http.js";
import {
  RECRUITMENT_READ_ENDPOINTS,
  recruitmentDetailEndpoints,
} from "./lib/endpoints.js";

const profile = getProfileOptions();
const pace = getPacedSleepSeconds(2, "api-default");

export const options = {
  ...profile,
  tags: { suite: "recruitment-hub" },
};

export function setup() {
  const candidatesRes = apiGet("/hr/recruitment/candidates?limit=10", {
    module: "recruitment",
    endpoint: "setup_candidates",
  });
  assertSetupOk(candidatesRes, "setup_candidates");

  const jobsRes = apiGet("/hr/recruitment/jobs?limit=10", {
    module: "recruitment",
    endpoint: "setup_jobs",
  });
  assertSetupOk(jobsRes, "setup_jobs");

  const interviewsRes = apiGet("/hr/recruitment/interviews?limit=10", {
    module: "recruitment",
    endpoint: "setup_interviews",
  });
  assertSetupOk(interviewsRes, "setup_interviews");

  return {
    candidateId: firstId(parseJson(candidatesRes)),
    jobId: firstId(parseJson(jobsRes)),
    interviewId: firstId(parseJson(interviewsRes)),
  };
}

export default function recruitmentHubLoadTest(ids) {
  const staticPick = RECRUITMENT_READ_ENDPOINTS[__ITER % RECRUITMENT_READ_ENDPOINTS.length];
  const staticRes = apiGet(staticPick.path, {
    module: "recruitment",
    endpoint: staticPick.name,
  });
  assertOk(staticRes, staticPick.name);

  const details = recruitmentDetailEndpoints(ids);
  if (details.length > 0) {
    const detailPick = details[__ITER % details.length];
    const detailRes = apiGet(detailPick.path, {
      module: "recruitment",
      endpoint: detailPick.name,
    });
    assertOk(detailRes, detailPick.name);
  }

  sleep(pace);
}
