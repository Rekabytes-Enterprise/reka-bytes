'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

/**
 * Top-level error boundary — last line of defense. Runtime API errors are
 * handled by toasts; this catches render crashes.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown render error',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center p-8">
          <div className="max-w-md border border-line bg-elevated p-8">
            <AlertTriangle className="mb-4 size-6 text-danger" aria-hidden />
            <h1 className="font-mono text-sm font-bold uppercase tracking-[0.12em] text-danger">
              // RENDER_ERROR
            </h1>
            <p className="mt-2 font-body text-sm text-muted">{this.state.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="mt-6 bg-accent px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-ink hover:bg-accent-hover"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
