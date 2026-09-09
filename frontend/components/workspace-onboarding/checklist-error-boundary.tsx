"use client";

import { Component, type ReactNode } from "react";

interface ChecklistErrorBoundaryProps {
  children: ReactNode;
}

interface ChecklistErrorBoundaryState {
  failed: boolean;
}

// A getting-started nudge must never take the route down; the failing read is
// already reported to observability before it throws (rejectContractViolation).
export class ChecklistErrorBoundary extends Component<
  ChecklistErrorBoundaryProps,
  ChecklistErrorBoundaryState
> {
  state: ChecklistErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ChecklistErrorBoundaryState {
    return { failed: true };
  }

  render(): ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
