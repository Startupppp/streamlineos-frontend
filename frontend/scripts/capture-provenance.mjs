/**
 * BUILD ID PROVENANCE CHECK — shared by check-route-bundle-budget.mjs and
 * check-web-vitals-budget.mjs.
 *
 * `.next/BUILD_ID` is the subject: Next generates it per build, so equality
 * means the `.next` directory on disk IS the build the capture or manifest
 * measured — a stronger claim than commit distance alone.
 */

export function captureProvenance(results, { buildIdOnDisk }) {
  const recorded =
    typeof results?.buildId === "string" && results.buildId.length > 0
      ? results.buildId
      : null;
  const onDisk =
    typeof buildIdOnDisk === "string" && buildIdOnDisk.length > 0
      ? buildIdOnDisk
      : null;

  if (recorded === null)
    return {
      status: "unrecorded",
      recorded,
      onDisk,
      message:
        "PROVENANCE — the manifest records no buildId, so there is no way to tell which build it " +
        "measured. Re-run the bundle measurement, which stamps .next/BUILD_ID into the manifest.",
    };
  if (onDisk === null)
    return {
      status: "no-build-on-disk",
      recorded,
      onDisk,
      message:
        `PROVENANCE — the manifest measured build ${recorded}, but there is no .next/BUILD_ID to compare it ` +
        "against, so its freshness could NOT be checked. Build the app before this gate, or treat this run " +
        "as proving nothing about whether the numbers describe the checked-out code.",
    };
  if (recorded === onDisk) return { status: "current", recorded, onDisk, message: null };
  return {
    status: "stale",
    recorded,
    onDisk,
    message:
      `PROVENANCE — STALE MANIFEST. It measured build ${recorded}; .next/BUILD_ID on disk is ${onDisk}.\n` +
      "      Every number in the manifest describes a build this checkout no longer holds, in both\n" +
      "      directions: a breach may already be fixed, and a regression may not be reported at all.\n" +
      "      Re-run the bundle measurement against the current build.",
  };
}
