import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { A11yProvider } from './context/A11yContext';
import { Login } from './components/Login';
import { AccessibilityAssistant } from './components/AccessibilityAssistant';
import './styles/App.css';

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard }))
);
const TeacherDashboard = lazy(() =>
  import('./components/TeacherDashboard').then(m => ({ default: m.TeacherDashboard }))
);

const AppLoadingFallback: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    color: '#334155',
    fontFamily: 'Inter, system-ui, sans-serif',
    gap: '0.75rem'
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid #e2e8f0',
      borderTopColor: '#0284c7',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Cargando plataforma...</span>
  </div>
);

const MainApp: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <AdminDashboard />
    </Suspense>
  );
};

export function App() {
  return (
    <AuthProvider>
      <A11yProvider>
        <AccessibilityAssistant />
        <MainApp />
      </A11yProvider>
    </AuthProvider>
  );
}

export default App;
