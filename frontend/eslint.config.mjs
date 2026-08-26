import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noRawVisualValues from "./eslint-rules/no-raw-visual-values.mjs";
import noUnlabelledIconButton from "./eslint-rules/no-unlabelled-icon-button.mjs";

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
      "features/landing/**",
      "app/(public)/**",
      "features/legal/**",
      "features/org-setup/**",
      "components/brand/**",
      "app/(auth)/**",
      "components/entitlement-gate.tsx",
      "components/ui/page-wrapper.tsx",
      "features/auth/**",
      "features/employee-onboarding/components/brand-column.tsx",
      "features/employee-onboarding/components/profile-preview.tsx",
    ],
    plugins: {
      streamline: {
        rules: {
          "no-raw-visual-values": noRawVisualValues,
          "no-unlabelled-icon-button": noUnlabelledIconButton,
        },
      },
    },
    rules: {
      "streamline/no-raw-visual-values": "error",
      "streamline/no-unlabelled-icon-button": "warn",
    },
  },
  {
    /**
     * Marketing and display surfaces, held to colour but not to the scales.
     *
     * A landing hero is set at 2.75rem, a pricing headline at 1.35rem, and both
     * carry hand-tuned shadows and radii — sizes and elevations that exist to be
     * looked at rather than read in a table. Forcing them onto the product scale
     * would flatten the page; adding a token for each would put marketing
     * one-offs into the system every product screen reads from.
     *
     * These were previously listed in the block above's `ignores`, which turned
     * the WHOLE rule off for them — colour included — while the comment claimed
     * colour was still enforced. It was not, and `included-apps-grid.tsx` had
     * drifted to `hover:border-slate-300 hover:bg-white` as a result. Naming the
     * relaxed kinds keeps the colour check, which is the one whose absence
     * silently breaks dark mode.
     */
    files: [
      "features/landing/**",
      "app/(public)/**",
      "features/legal/**",
      "features/org-setup/**",
      "components/brand/**",
      "app/(auth)/**",
      "components/entitlement-gate.tsx",
      "components/ui/page-wrapper.tsx",
      "features/auth/**",
      "features/employee-onboarding/components/brand-column.tsx",
      "features/employee-onboarding/components/profile-preview.tsx",
    ],
    plugins: {
      streamline: {
        rules: {
          "no-raw-visual-values": noRawVisualValues,
          "no-unlabelled-icon-button": noUnlabelledIconButton,
        },
      },
    },
    rules: {
      "streamline/no-raw-visual-values": ["error", { skip: ["type", "shadow", "radius"] }],
      "streamline/no-unlabelled-icon-button": "warn",
    },
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
