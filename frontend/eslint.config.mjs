import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noRawVisualValues from "./eslint-rules/no-raw-visual-values.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/static-components": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" },
      ],
    },
  },
  {
    /**
     * Held where the migration has actually reached. Widen this list as
     * docs/TOKEN-MIGRATION.md records more batches done — a rule that fires
     * eleven thousand times is a rule somebody disables.
     */
    files: [
      "features/settings/**/*.{ts,tsx}",
      "features/renderer/**/*.{ts,tsx}",
      "features/crm/autonomy/**/*.{ts,tsx}",
      "features/crm/import/**/*.{ts,tsx}",
      "lib/design-tokens/**/*.{ts,tsx}",
    ],
    plugins: { streamline: { rules: { "no-raw-visual-values": noRawVisualValues } } },
    rules: { "streamline/no-raw-visual-values": "error" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "public/**",
    "next-env.d.ts",
    ".claude/**",
    "jest.config.cjs",
    "jest.setup.js",
  ]),
]);

export default eslintConfig;
