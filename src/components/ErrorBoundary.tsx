import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleClearAndReset = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('sb_posts');
        localStorage.removeItem('sb_groups');
        localStorage.removeItem('sb_reels');
        localStorage.removeItem('sb_tutors');
      }
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="h-12 w-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">An error occurred</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The application encountered a temporary error. You can try again or reload the page to continue.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-3 text-left">
                <p className="text-[10px] font-mono text-red-300 break-words leading-tight">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </button>
              <button
                onClick={this.handleClearAndReset}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Reset Storage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
