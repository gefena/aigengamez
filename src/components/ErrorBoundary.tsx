"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Game error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '2rem',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-highlight)',
          textAlign: 'center',
          gap: '1rem',
        }}>
          <h4 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>Something went wrong</h4>
          <p style={{ color: 'var(--text-secondary)' }}>This game encountered an error and could not load.</p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'var(--accent-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
