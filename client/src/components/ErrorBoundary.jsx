import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Se ha producido un error inesperado al renderizar
            </h2>
            
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {this.state.error?.message || 'Error desconocido en la interfaz.'}
            </p>

            <button
              onClick={this.handleReload}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recargar vista</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
