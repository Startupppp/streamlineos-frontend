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

module.exports = async () => {
  const jestConfig = await createJestConfig(config)();
  // next/jest only exempts transpilePackages from its node_modules transform
  // ignore; next-auth v5 ships untranspiled ESM, so tests importing it fail
  // with "Cannot use import statement outside a module" unless it (and
  // @auth/core) are spliced into the generated allowlists.
  jestConfig.transformIgnorePatterns = (jestConfig.transformIgnorePatterns ?? []).map(
    (pattern) => pattern.replace(
      /\(geist/g,
      "(geist|next-auth|@auth|@auth\\+core|jose|htmlparser2|domhandler|domelementtype|dom-serializer|domutils|entities|nanoid",
    ),
  );
  return jestConfig;
};
