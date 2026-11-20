import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Invertis Hub Error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '24px',
          fontFamily: 'Arial',
          color: '#b42318',
          background: '#fff',
          minHeight: '100vh',
          overflowWrap: 'anywhere'
        }}>
          <h2>Invertis Hub Error</h2>
          <p>{this.state.error.message}</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
