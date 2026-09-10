import { MANIFEST } from "@/lib/module-manifest";

const NAMESPACE_TO_MODULE = new Map<string, string>();
for (const module of MANIFEST.modules) {
  for (const namespace of module.administersNamespaces) {
    NAMESPACE_TO_MODULE.set(namespace, module.id);
  }
}

export function moduleOwningNamespace(namespace: string): string {
  return NAMESPACE_TO_MODULE.get(namespace) ?? namespace;
}

export function administeringModuleOf(permissionKey: string): string {
  const separatorIndex = permissionKey.indexOf(":");
  const namespace =
    separatorIndex === -1 ? permissionKey : permissionKey.slice(0, separatorIndex);
  return moduleOwningNamespace(namespace);
}
