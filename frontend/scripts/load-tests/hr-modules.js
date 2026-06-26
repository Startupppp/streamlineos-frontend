import { sleep } from "k6";
import { getProfileOptions, getPacedSleepSeconds } from "./lib/config.js";
import { apiGet, assertOk } from "./lib/http.js";
import { HR_READ_ENDPOINTS } from "./lib/endpoints.js";

const profile = getProfileOptions();
const pace = getPacedSleepSeconds(1, "api-default");

export const options = {
  ...profile,
  tags: { suite: "hr-modules" },
};

export default function hrModulesLoadTest() {
  const pick = HR_READ_ENDPOINTS[__ITER % HR_READ_ENDPOINTS.length];
  const res = apiGet(pick.path, { module: "hr", endpoint: pick.name });
  assertOk(res, pick.name);
  sleep(pace);
}
