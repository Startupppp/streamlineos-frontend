"use client";

import { Component, type ReactNode } from "react";
import { ErrorState } from "@/components/shared/error-state";

interface SectionErrorBoundaryProps {
  sectionLabel: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <ErrorState
        compact
        className={this.props.className}
        title={`${this.props.sectionLabel} is unavailable`}
        description={this.props.description ?? "This section could not load. The rest of the page is unaffected."}
        onRetry={this.handleRetry}
      />
    );
  }
}
