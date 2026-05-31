/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UnregisteredGate } from './components/UnregisteredGate';
import { RegistrationLanding } from './components/RegistrationLanding';
import { PurnaPendingGate } from './components/PurnaPendingGate';
import { PurnaDashboard } from './components/PurnaDashboard';
import { PurnaProfileForm } from './components/PurnaProfileForm';
import { AdminDashboard } from './components/AdminDashboard';
import { AnggotaDashboard } from './components/AnggotaDashboard';
import { WelcomePage } from './components/WelcomePage';
import { UserRole, UserStatus } from './types';
import { isPurnaAuthGate } from './lib/authGate';
import { isPurnaProfileComplete } from './lib/purnaProfile';
import { Shield, LogOut } from 'lucide-react';
import { getGoogleSignInErrorMessage } from './lib/authErrors';
import { Alert } from './components/ui/Alert';

function ScoutAppContent() {
  const { currentUser, userProfile, authGate, loading, authError, clearAuthError, signInWithGoogle, logout } = useAuth();
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [publicView, setPublicView] = React.useState<'login' | 'register'>('login');

  const handleGoogleLogin = async () => {
    setLoginError(null);
    clearAuthError();
    try {
      await signInWithGoogle();
    } catch (err) {
      setLoginError(getGoogleSignInErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div id="scout-global-loader" className="min-h-screen bg-bento-bg flex flex-col justify-center items-center">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-bento-border shadow-sm">
          <Shield className="w-7 h-7 text-bento-primary animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-semibold text-bento-text">ForestBest Scout</p>
        <p className="text-xs text-bento-muted mt-1">Memuat sesi...</p>
      </div>
    );
  }

  if (!currentUser) {
    if (publicView === 'register') {
      return <RegistrationLanding onBack={() => setPublicView('login')} />;
    }

    return (
      <WelcomePage
        loginError={loginError}
        authError={authError}
        onLogin={handleGoogleLogin}
        onRegister={() => setPublicView('register')}
      />
    );
  }

  if (currentUser && authGate === 'unregistered') {
    return <UnregisteredGate />;
  }

  if (currentUser && isPurnaAuthGate(authGate)) {
    return <PurnaPendingGate status={authGate} />;
  }

  if (currentUser && !userProfile) {
    return (
      <div id="scout-global-loader" className="min-h-screen bg-bento-bg flex flex-col justify-center items-center">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-bento-border shadow-sm">
          <Shield className="w-7 h-7 text-bento-primary animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-semibold text-bento-text">ForestBest Scout</p>
        <p className="text-xs text-bento-muted mt-1">Menyiapkan profil...</p>
      </div>
    );
  }

  if (userProfile && userProfile.status === UserStatus.NON_AKTIF) {
    return (
      <div id="scout-gate-disabled" className="min-h-screen bg-bento-bg flex flex-col justify-center py-12 px-4">
        <div className="max-w-md w-full mx-auto scout-card p-8 text-center">
          <Alert
            variant="warning"
            title="Akun dinonaktifkan"
            message={`Profil ${userProfile.nama} ditandai nonaktif oleh Pembina.`}
            tips={['Hubungi Pembina atau staf kesiswaan untuk mengaktifkan kembali akses.']}
            className="mb-6 text-left"
          />
          <button id="btn-scout-disabled-logout" onClick={logout} className="w-full scout-btn-secondary py-3 text-sm">
            <LogOut className="w-4 h-4" />
            Keluar Sesi
          </button>
        </div>
      </div>
    );
  }

  if (userProfile && userProfile.role === UserRole.ADMIN) {
    return (
      <div id="scout-root-admin" className="min-h-screen bg-bento-bg">
        <div className="bg-white border-b border-bento-border px-4 py-2.5 sm:py-3 sticky top-0 z-50 safe-area-inset-top">
          <div className="scout-page max-w-6xl flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-bento-accent flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-bento-dark" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-bento-text truncate">ForestBest Scout</p>
                <p className="text-[10px] sm:text-[11px] text-bento-muted truncate">Panel Pembina</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs sm:text-sm text-bento-muted hidden md:inline max-w-[120px] truncate">{userProfile.nama}</span>
              <button id="btn-admin-inner-logout" onClick={logout} className="scout-btn-secondary text-xs py-2 px-3">
                Keluar
              </button>
            </div>
          </div>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  if (userProfile && userProfile.role === UserRole.PURNA) {
    if (!isPurnaProfileComplete(userProfile)) {
      return <PurnaProfileForm />;
    }
    return <PurnaDashboard />;
  }

  return <AnggotaDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <ScoutAppContent />
    </AuthProvider>
  );
}
