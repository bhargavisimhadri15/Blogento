import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep error details in console for quick debugging in browser devtools.
    console.error('UI crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <div className="container" style={{ maxWidth: '720px', paddingTop: '3rem' }}>
            <div className="card" style={{ padding: '2rem' }}>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>App failed to load</h1>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                A runtime error occurred. Please refresh once.
              </p>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
