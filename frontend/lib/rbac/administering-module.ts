import { MANIFEST } from "@/lib/module-manifest";

const NAMESPACE_TO_MODULE = new Map<string, string>();
for (const manifestModule of MANIFEST.modules) {
  for (const namespace of manifestModule.administersNamespaces) {
    NAMESPACE_TO_MODULE.set(namespace, manifestModule.id);
  }
}

export function moduleOwningNamespace(namespace: string): string {
  return NAMESPACE_TO_MODULE.get(namespace) ?? namespace;
}

export function namespaceOf(permissionKey: string): string {
  const separatorIndex = permissionKey.indexOf(":");
  return separatorIndex === -1
    ? permissionKey
    : permissionKey.slice(0, separatorIndex);
}

export function administeringModuleOf(permissionKey: string): string {
  return moduleOwningNamespace(namespaceOf(permissionKey));
}
