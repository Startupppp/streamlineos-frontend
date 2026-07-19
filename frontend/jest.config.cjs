const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  // next/jest's automatic tsconfig "paths" -> moduleNameMapper generation isn't resolving
  // "@/*" in this Next 16 setup — mapped explicitly so component tests can import via "@/...".
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

module.exports = createJestConfig(config);
