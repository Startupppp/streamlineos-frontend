import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noRawVisualValues from "./eslint-rules/no-raw-visual-values.mjs";
import noUnlabelledIconButton from "./eslint-rules/no-unlabelled-icon-button.mjs";

/**
 * One plugin object, referenced by every block that enables a rule from it.
 *
 * ESLint 9 compares plugin definitions by identity when a name is registered in
 * more than one config block, so three separate `{ rules: { ... } }` literals —
 * which is what stood here — are three different plugins under one name, and it
 * refuses the whole config with "Cannot redefine plugin". Not degraded: `eslint`
 * would not start at all, so `pnpm lint` has been reporting nothing about any
 * file on this branch.
 *
 * The blocks still differ in what they *enable* and with which options; that is
 * a property of `rules`, not of the plugin.
 */
const streamlinePlugin = {
  rules: {
    "no-raw-visual-values": noRawVisualValues,
    "no-unlabelled-icon-button": noUnlabelledIconButton,
  },
};

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
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: [
      "features/build/**/*.{ts,tsx}",
      "hooks/api/build/**/*.{ts,tsx}",
      "app/(authenticated)/build/**/*.{ts,tsx}",
    ],
    ignores: [
      "features/build/intake/**",
      "features/build/qa/**",
      "features/build/reports/**",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
      "react-hooks/purity": "error",
      "react-hooks/immutability": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: [
      "features/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "app/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
    ],
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
    plugins: { streamline: streamlinePlugin },
    rules: {
      "streamline/no-raw-visual-values": "error",
      "streamline/no-unlabelled-icon-button": "error",
    },
  },
  {
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
    plugins: { streamline: streamlinePlugin },
    rules: {
      "streamline/no-raw-visual-values": [
        "error",
        { skip: ["type", "shadow", "radius"] },
      ],
      "streamline/no-unlabelled-icon-button": "error",
    },
  },
  /**
   * Generated output only — nothing here is authored, so nothing here is fixable.
   *
   * `.next-buildmart/**` is an alternate Next `distDir` (718 MB of minified
   * chunks under `dev/`, .gitignore:24). `.next/**` is name-exact, so eslint was
   * the one frontend scanner still walking it; every other one excludes it via
   * `isExcludedScanDir` in `scripts/check-repo-paths.mjs`. `coverage/**` is the
   * istanbul report `jest --coverage` writes (.gitignore:16).
   *
   * `build/**` is root-anchored (the pattern contains a slash), so it ignores a
   * root `build/` output directory and NOT the Build module's `features/build`,
   * `hooks/api/build` or `app/(authenticated)/build`.
   */
  globalIgnores([
    ".next/**",
    // A second dev server on this working tree builds into its own directory
    // (`NEXT_DIST_DIR`, see next.config.ts). Generated output, same as `.next`.
    ".next-*/**",
    ".next-buildmart/**",
    "coverage/**",
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
