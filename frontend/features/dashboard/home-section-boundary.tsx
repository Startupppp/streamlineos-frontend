"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@/components/shared/error-state";

interface HomeSectionBoundaryProps {
  sectionLabel: string;
  children: ReactNode;
}

interface HomeSectionBoundaryState {
  hasError: boolean;
}

export class HomeSectionBoundary extends Component<
  HomeSectionBoundaryProps,
  HomeSectionBoundaryState
> {
  state: HomeSectionBoundaryState = { hasError: false };

  static getDerivedStateFromError(): HomeSectionBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== "production")
      console.error(
        `Home section "${this.props.sectionLabel}" failed`,
        error,
        info.componentStack,
      );
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <ErrorState
        compact
        title={`${this.props.sectionLabel} is unavailable`}
        description="This section could not load. The rest of your Home page is unaffected."
        onRetry={this.handleRetry}
      />
    );
  }
}
