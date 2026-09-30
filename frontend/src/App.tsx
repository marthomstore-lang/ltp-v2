import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { A11yProvider } from './context/A11yContext';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AccessibilityAssistant } from './components/AccessibilityAssistant';
import './styles/App.css';

const MainApp: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  if (user?.role === 'Docente') {
    return <TeacherDashboard />;
  }

  return <AdminDashboard />;
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
