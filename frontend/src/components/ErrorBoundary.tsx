import React, { Component, ErrorInfo, ReactNode } from "react";

declare global {
  interface Window {
    __REACT_ERROR__: any;
  }
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console (visible in Playwright)
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    console.error('Stack trace:', error.stack);
    
    // Store error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Make error globally accessible for Playwright inspection
    window.__REACT_ERROR__ = {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-fallback" style={{ 
          padding: '20px', 
          background: 'red', 
          color: 'white',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999
        }}>
          <h2>Application Error Detected</h2>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error && this.state.error.toString()}</pre>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;