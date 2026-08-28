export {
  UNIVERSAL_ROUTES,
  UNIVERSAL_EXCLUSIONS,
  isAccessAdministrationPath,
  isUniversalRoute,
  matchUniversalRoute,
} from "./universal-routes";
export type { UniversalRoute } from "./universal-routes";
export {
  ROUTE_ACCESS_EXTENSIONS,
  matchRouteAccessExtension,
} from "./route-access-extensions";
export type { RouteAccessExtension } from "./route-access-extensions";
export {
  describeRouteAccess,
  orgModuleKeyForProduct,
  resolveRouteAccess,
} from "./route-access";
export type { RouteAccessDecision } from "./route-access";
