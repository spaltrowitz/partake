"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { PrimaryButton } from "./UI";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="text-4xl">😵</span>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-[#8B9BB4]">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <PrimaryButton
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="max-w-xs"
          >
            Try again
          </PrimaryButton>
        </div>
      );
    }
    return this.props.children;
  }
}
