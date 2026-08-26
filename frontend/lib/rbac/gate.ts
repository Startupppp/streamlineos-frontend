/**
 * What a gated surface should render, decided in one place.
 *
 * Phase 2, ticket 26. Every CRM read hook gates itself on a permission:
 *
 *     const canView = useCan("crm:campaigns:view");
 *     return useQuery({ ..., enabled: canView });
 *
 * In TanStack Query v5 a **disabled** query is `isPending: true,
 * isFetching: false`, and `isLoading` is defined as `isPending && isFetching` --
 * so `isLoading` is **false**. A user without the permission falls straight
 * through the loading gate, reaches the empty branch, and is told
 * **"No campaigns yet"** when the truth is **"you are not allowed to see this"**.
 *
 * That is worse than an unexplained failure. The product does not merely decline
 * to explain itself; it **asserts something false about the customer's data**. A
 * rep who cannot see the pipeline is told the pipeline is empty, and their next
 * action is to re-create something that already exists.
 *
 * It is also invisible to whoever could fix it: an owner or an admin holds every
 * permission and will never once see it.
 *
 * There is a second conflation underneath the first, and it is the reason this
 * is a function rather than a boolean. `useCan` answers `false` while the access
 * response is still in flight, because there is nothing yet to check against. So
 * "denied" and "not known yet" are the same value, and a screen that branches on
 * it shows **every** user -- including one with the permission -- a flash of
 * "Access Restricted" on first paint. Fixing only the reported half would have
 * traded a lie told to some users for a lie told briefly to all of them.
 *
 * Hence three inputs and five outcomes, ordered. The order is the whole content
 * of this function: what is not yet known outranks what is denied, denial
 * outranks a query that was never allowed to run, and emptiness is only
 * emptiness once something has actually looked.
 */

/** Whether the caller holds the permission -- including "not known yet". */
export type AccessState = "loading" | "granted" | "denied";

export type GateState = "loading" | "denied" | "error" | "empty" | "ready";

export interface GateInput {
  readonly access: AccessState;
  /** The query's own loading flag. Meaningless while `access` is not granted. */
  readonly isLoading: boolean;
  readonly isError: boolean;
  /** Whether the loaded result has anything in it. */
  readonly isEmpty: boolean;
}

export function resolveGate({ access, isLoading, isError, isEmpty }: GateInput): GateState {
  /**
   * Not knowing comes first.
   *
   * The access response decides whether the query below it is even allowed to
   * run, so until it lands there is no honest thing to say about the data. A
   * skeleton claims nothing; every other branch claims something.
   */
  if (access === "loading") return "loading";

  /**
   * Denial outranks the query, and the query is not consulted.
   *
   * A denied query never ran. Reading its flags is reading the defaults of a
   * request that was refused, which is exactly the mistake this file exists to
   * correct -- `isLoading` is false and the rows are absent, so the ordinary
   * branch order lands on "empty" and states it as fact.
   */
  if (access === "denied") return "denied";

  if (isLoading) return "loading";
  if (isError) return "error";
  if (isEmpty) return "empty";
  return "ready";
}

/**
 * `useCan`'s answer, kept as three values rather than collapsed to two.
 *
 * Takes the access query's own loading flag rather than inferring it from the
 * absence of data, because "no data yet" and "data says no" are the two things
 * being told apart and inferring one from the other is how they were conflated.
 */
export function accessState(input: {
  readonly isLoading: boolean;
  readonly granted: boolean;
}): AccessState {
  if (input.isLoading) return "loading";
  return input.granted ? "granted" : "denied";
}
