import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for AI-powered components
 * Catches errors and displays fallback UI instead of crashing the app
 *
 * @example
 * ```tsx
 * <AiErrorBoundary componentName="Practice Chat">
 *   <PracticeChatModal ... />
 * </AiErrorBoundary>
 * ```
 */
export class AiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const componentName = this.props.componentName || 'AI Component';

    console.error(`[AiErrorBoundary] Error in ${componentName}:`, error);
    console.error('[AiErrorBoundary] Error info:', errorInfo);

    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to external service (optional)
    // logErrorToService(error, errorInfo, componentName);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const componentName = this.props.componentName || 'AI Component';
      const errorMessage = this.state.error?.message || 'Unknown error occurred';

      return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-700 rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-300 mb-1">
                  ⚠️ {componentName} Error
                </h3>
                <p className="text-sm text-red-200 mb-3">
                  Something went wrong with the AI service.
                </p>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-800 rounded p-3 mb-4">
              <p className="text-xs text-red-200 font-mono break-words">
                {errorMessage}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-medium transition-colors"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium transition-colors"
              >
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-300">
                  Developer Info
                </summary>
                <pre className="mt-2 p-2 bg-slate-900 rounded text-slate-300 overflow-auto max-h-32">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AiErrorBoundary;
