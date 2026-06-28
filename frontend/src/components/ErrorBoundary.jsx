import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('DocDash section error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px 20px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '10px',
          fontSize: '13px',
          color: '#991B1B',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>
              {this.props.label || 'This section'} could not be displayed.
            </p>
            <p style={{ margin: '2px 0 0', color: '#B91C1C', fontSize: '12px' }}>
              The rest of your dashboard is unaffected.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              color: '#991B1B',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
