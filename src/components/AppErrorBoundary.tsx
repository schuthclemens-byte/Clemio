import { Component, type ErrorInfo, type ReactNode } from "react";
import { logAppError } from "@/lib/appErrorLogging";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void logAppError({
      title: "React Render-Fehler",
      message: error.message,
      stack: error.stack,
      severity: "fatal",
      details: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
          <div className="space-y-3">
            <h1 className="text-lg font-semibold text-foreground">Clemio lädt neu</h1>
            <p className="text-sm text-muted-foreground">Ein Fehler wurde automatisch gemeldet.</p>
            <button
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;