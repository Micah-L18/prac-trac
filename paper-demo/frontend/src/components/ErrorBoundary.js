import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
          color: 'var(--text-primary)',
          flexDirection: 'column',
          padding: '20px'
        }}>
          <div className="glass" style={{ 
            padding: '40px', 
            textAlign: 'center',
            maxWidth: '600px'
          }}>
            <h1 style={{ color: 'var(--accent-orange)', marginBottom: '20px' }}>
              🏐 Something went wrong
            </h1>
            <p style={{ marginBottom: '20px' }}>
              PracTrac encountered an unexpected error. Please refresh the page to try again.
            </p>
            <button 
              className="glass-button primary"
              onClick={() => window.location.reload()}
              style={{ marginRight: '10px' }}
            >
              Refresh Page
            </button>
            <button 
              className="glass-button secondary"
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
            >
              Reset App
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--accent-orange)' }}>
                  Error Details (Development)
                </summary>
                <pre style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '10px', 
                  borderRadius: '0px',
                  fontSize: '12px',
                  overflow: 'auto',
                  marginTop: '10px'
                }}>
                  {this.state.error && this.state.error.toString()}
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

export default ErrorBoundary;