import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            margin: '2rem auto',
            maxWidth: '650px',
            padding: '2rem',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #fecdd3',
            boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.1)',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#ffe4e6',
              color: '#e11d48',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <AlertTriangle size={28} />
          </div>

          <h3
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#881337',
              margin: '0 0 0.5rem 0'
            }}
          >
            {this.props.fallbackTitle || 'Hubo un inconveniente al cargar esta sección'}
          </h3>

          <p
            style={{
              fontSize: '0.86rem',
              color: '#64748b',
              margin: '0 0 1.25rem 0',
              lineHeight: 1.5
            }}
          >
            Se ha producido un error inesperado al procesar la información visual. Puedes reintentar la operación o recargar la pantalla.
          </p>

          {this.state.error?.message && (
            <div
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.78rem',
                color: '#9f1239',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '1.25rem'
              }}
            >
              {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<RefreshCw size={15} />}
              onClick={this.handleReload}
            >
              Reintentar Sección
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Recargar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
