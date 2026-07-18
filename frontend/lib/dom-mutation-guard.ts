export {};

declare global {
  interface Window {
    __fb_dom_guard__?: true;
  }
}

function installDomMutationGuard(): void {
  if (typeof window === "undefined") return;
  if (window.__fb_dom_guard__) return;
  window.__fb_dom_guard__ = true;

  const nativeRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function removeChild<T extends Node>(
    this: Node,
    child: T,
  ): T {
    if (!this.contains(child)) {
      return child;
    }
    nativeRemoveChild.call(this, child);
    return child;
  };

  const nativeInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function insertBefore<T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode !== null && !this.contains(referenceNode)) {
      nativeInsertBefore.call(this, newNode, null);
      return newNode;
    }
    nativeInsertBefore.call(this, newNode, referenceNode);
    return newNode;
  };
}

installDomMutationGuard();
