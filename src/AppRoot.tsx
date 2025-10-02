import React, { useState } from 'react';
import App from '../App';
import LoginPage from '../pages/LoginPage.tsx';
import SignUpPage from '../pages/SignUpPage.tsx';
import { useAuth } from './contexts/authContext.tsx';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-6" />
      <p className="text-slate-400">Загружаем ваши данные…</p>
    </div>
  </div>
);

const AppRoot: React.FC = () => {
  const { user, initializing } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  if (initializing) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (mode === 'login') {
      return <LoginPage onSwitchToSignUp={() => setMode('signup')} />;
    }
    return <SignUpPage onSwitchToLogin={() => setMode('login')} />;
  }

  return <App />;
};

export default AppRoot;
