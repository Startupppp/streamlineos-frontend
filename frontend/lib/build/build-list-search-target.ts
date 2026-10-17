type SearchInputRef = { current: HTMLInputElement | null };

let activeSearchRef: SearchInputRef | null = null;

export function claimBuildListSearchTarget(ref: SearchInputRef): () => void {
  activeSearchRef = ref;
  return () => {
    if (activeSearchRef === ref) {
      activeSearchRef = null;
    }
  };
}

export function tryHandleBuildListSearchShortcut(): boolean {
  if (activeSearchRef === null) return false;
  activeSearchRef.current?.focus();
  return true;
}
