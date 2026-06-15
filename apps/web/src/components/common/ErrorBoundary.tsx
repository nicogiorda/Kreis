import { Component, type ErrorInfo, type ReactNode } from "react";
import { updateStartupDebug } from "../../startup/startup-debug";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Kreis render error", error, errorInfo);
    updateStartupDebug({ globalError: error.message });
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-dvh place-items-center bg-kreis-lace px-6 text-center text-kreis-ink">
          <section className="max-w-[340px] rounded-[18px] bg-[rgba(10,10,10,0.06)] px-5 py-6">
            <h1 className="m-0 font-sans text-[20px] font-medium leading-tight">No pudimos abrir Kreis.</h1>
            <p className="mt-3 mb-0 text-[15px] leading-snug text-[rgba(10,10,10,0.58)]">
              Cerrá y volvé a abrir la app. Si sigue pasando, probá actualizar la versión instalada.
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
