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
     * Platform-wide, now that every module has been migrated.
     *
     * It flags only what the token set can express — see the rule itself. Solid
     * fills and gradients have no role yet and are left alone rather than
     * demanding something impossible, which is how a rule gets disabled.
     */
    files: ["features/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: [
      /**
       * Marketing surfaces keep their own display type.
       *
       * A landing hero is set at 2.75rem and a pricing headline at 1.35rem —
       * sizes that exist to be looked at rather than read in a table. Forcing
       * them onto the product scale would flatten the page, and adding tokens
       * for each would put marketing one-offs into the system every product
       * screen reads from. Colour is still enforced here; only the type check
       * is relaxed, which is why these files are listed rather than the rule
       * being weakened.
       */
      "features/landing/**",
      "app/(public)/**",
      // The same argument, for the surfaces that share the marketing voice: a
      // brand composition, the onboarding welcome, the legal shell, the
      // invitation and entitlement pages. Each sets display type meant to be
      // looked at rather than read in a table. Colour is still enforced.
      "features/legal/**",
      "features/org-setup/**",
      "components/brand/**",
      "app/(auth)/**",
      "components/entitlement-gate.tsx",
      // Three more display headings, each the largest thing on its own screen:
      // the page title, the auth panel, the onboarding brand column.
      "components/ui/page-wrapper.tsx",
      "features/auth/**",
      "features/employee-onboarding/components/brand-column.tsx",
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
