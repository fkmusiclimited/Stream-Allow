import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
    this.handleReset = this.handleReset.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
  }

  static getDerivedStateFromError(error: any): State {
    const msg = error instanceof Error ? error.message : String(error || 'Unexpected rendering error');
    return {
      hasError: true,
      errorMessage: msg
    };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error('[Stream Allow ErrorBoundary Caught Error]:', error, errorInfo);
  }

  handleReset() {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  }

  handleGoHome() {
    try {
      localStorage.removeItem('streamjoin_users_data');
    } catch {}
    this.setState({ hasError: false, errorMessage: '' });
    window.location.href = '/';
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-[#0B0F17] text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-[#FF1B6B]/30 selection:text-white">
          <div className="max-w-md w-full bg-[#111827]/95 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Stream Allow Preview Protected</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              An unexpected render issue was safely caught. The application prevented a blank screen and is ready to recover.
            </p>

            {this.state.errorMessage ? (
              <div className="mb-6 p-3 rounded-lg bg-black/40 border border-slate-800 text-left overflow-auto max-h-32 text-[11px] font-mono text-rose-300">
                {this.state.errorMessage}
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] hover:opacity-95 shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Preview</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
