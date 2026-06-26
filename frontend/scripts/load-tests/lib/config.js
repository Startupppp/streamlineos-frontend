export const BASE_URL = __ENV.BASE_URL || "http://localhost:1000";
export const API_PREFIX = `${BASE_URL}/api`;

export const SESSION_COOKIE = (__ENV.SESSION_COOKIE || "").trim();
export const LOAD_PROFILE = __ENV.LOAD_PROFILE || "smoke";
export const LOAD_TEST_SECRET = (__ENV.LOAD_TEST_SECRET || "").trim();
export const REQUEST_PACE_MS = Number(__ENV.REQUEST_PACE_MS || 0);

export const WRITE_ENABLED = __ENV.WRITE_ENABLED === "true";

const PROFILES = {
  baseline: {
    stages: [{ duration: "45s", target: 1 }],
    thresholds: {
      http_req_failed: ["rate<0.01"],
      http_req_duration: ["p(95)<3000"],
    },
  },
  smoke: {
    stages: [
      { duration: "15s", target: 1 },
      { duration: "30s", target: 2 },
      { duration: "15s", target: 0 },
    ],
    thresholds: {
      http_req_failed: ["rate<0.01"],
      http_req_duration: ["p(95)<3000"],
    },
  },
  load: {
    stages: [
      { duration: "30s", target: 10 },
      { duration: "2m", target: 25 },
      { duration: "2m", target: 25 },
      { duration: "30s", target: 0 },
    ],
    thresholds: {
      http_req_failed: ["rate<0.02"],
      http_req_duration: ["p(95)<1500"],
      "http_req_duration{module:recruitment}": ["p(95)<2500"],
      "http_req_duration{module:chat}": ["p(95)<1200"],
      "http_req_duration{module:hr}": ["p(95)<1500"],
    },
  },
  stress: {
    stages: [
      { duration: "1m", target: 20 },
      { duration: "3m", target: 50 },
      { duration: "2m", target: 75 },
      { duration: "1m", target: 0 },
    ],
    thresholds: {
      http_req_failed: ["rate<0.05"],
      http_req_duration: ["p(95)<3000"],
    },
  },
};

export function getProfileOptions(profileName = LOAD_PROFILE) {
  const profile = PROFILES[profileName] || PROFILES.smoke;
  return {
    stages: profile.stages,
    thresholds: profile.thresholds,
  };
}

function parseDurationSeconds(duration) {
  const match = duration.match(/^(\d+)(s|m|h)$/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (match[2] === "m") return value * 60;
  if (match[2] === "h") return value * 3600;
  return value;
}

export function getAllScenarioStages(profileName = LOAD_PROFILE) {
  const profile = getProfileOptions(profileName);
  if (LOAD_TEST_SECRET || profileName === "load" || profileName === "stress") {
    return profile.stages;
  }
  const totalSeconds = profile.stages.reduce(
    (sum, stage) => sum + parseDurationSeconds(stage.duration),
    0,
  );
  return [{ duration: `${totalSeconds}s`, target: 1 }];
}

export function getAllScenarioStartTime(scenarioIndex, profileName = LOAD_PROFILE) {
  if (LOAD_TEST_SECRET || profileName === "load" || profileName === "stress") {
    return `${scenarioIndex * 20}s`;
  }
  const stages = getAllScenarioStages(profileName);
  const durationSeconds = parseDurationSeconds(stages[0].duration);
  return `${scenarioIndex * durationSeconds}s`;
}

const TIER_LIMITS_PER_MIN = {
  "api-default": 90,
  chat: 110,
};

export function getPacedSleepSeconds(endpointsPerIteration, tier = "api-default") {
  if (LOAD_TEST_SECRET) {
    return REQUEST_PACE_MS > 0 ? REQUEST_PACE_MS / 1000 : 0.2;
  }
  const limit = TIER_LIMITS_PER_MIN[tier] || TIER_LIMITS_PER_MIN["api-default"];
  const ms = Math.ceil(60000 / limit / Math.max(endpointsPerIteration, 1));
  return Math.max(ms, 200) / 1000;
}
