/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProfileForm } from './components/ProfileForm';
import { PurnaRegistrationLanding } from './components/PurnaRegistrationLanding';
import { PurnaPendingGate } from './components/PurnaPendingGate';
import { PurnaDashboard } from './components/PurnaDashboard';
import { PurnaProfileForm } from './components/PurnaProfileForm';
import { AdminDashboard } from './components/AdminDashboard';
import { AnggotaDashboard } from './components/AnggotaDashboard';
import { UserRole, UserStatus } from './types';
import { isPurnaProfileComplete } from './lib/purnaProfile';
import { Compass, LogOut, ShieldCheck, QrCode, MapPin, Award } from 'lucide-react';
import { getGoogleSignInErrorMessage } from './lib/authErrors';
import { Alert } from './components/ui/Alert';

function ScoutAppContent() {
  const { currentUser, userProfile, purnaGate, loading, authError, clearAuthError, signInWithGoogle, logout } = useAuth();
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [publicView, setPublicView] = React.useState<'login' | 'purna-register'>('login');

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
          <Compass className="w-7 h-7 text-bento-primary animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <p className="mt-4 text-sm font-semibold text-bento-text">ForestBest Scout</p>
        <p className="text-xs text-bento-muted mt-1">Memuat sesi...</p>
      </div>
    );
  }

  if (!currentUser) {
    if (publicView === 'purna-register') {
      return <PurnaRegistrationLanding onBack={() => setPublicView('login')} />;
    }

    return (
      <div id="scout-gate-login" className="min-h-screen bg-bento-bg flex flex-col justify-center py-8 sm:py-10 px-4">
        <div className="max-w-md w-full mx-auto scout-card overflow-hidden">
          <div className="px-5 sm:px-8 pt-8 sm:pt-10 pb-6 text-center">
            <div className="w-14 h-14 bg-bento-accent rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Compass className="w-7 h-7 text-bento-dark" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-bento-muted">
              Sistem Presensi Pramuka
            </p>
            <h1 className="text-2xl font-bold text-bento-text mt-1">ForestBest Scout</h1>
            <p className="text-sm text-bento-muted mt-2 leading-relaxed">
              Absensi digital berbasis QR Code dan verifikasi lokasi GPS.
            </p>
          </div>

          <div className="px-5 sm:px-8 pb-6 sm:pb-8 space-y-4">
            <div className="grid gap-3">
              {[
                { icon: QrCode, title: 'QR Dinamis', desc: 'Token harian yang berganti otomatis setiap tengah malam.' },
                { icon: MapPin, title: 'Verifikasi GPS', desc: 'Koordinat lokasi dicatat saat check-in.' },
                { icon: ShieldCheck, title: 'Aman & Terpusat', desc: 'Data kehadiran tersimpan di cloud Firebase.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-3.5 bg-bento-soft rounded-2xl border border-bento-border">
                  <div className="p-2 bg-white rounded-xl shrink-0">
                    <Icon className="w-4 h-4 text-bento-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-bento-text">{title}</h4>
                    <p className="text-xs text-bento-muted mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {(loginError || authError) && (
              <Alert
                variant="error"
                title="Gagal masuk"
                message={loginError || authError || undefined}
                tips={['Pastikan akun Google Anda terdaftar.', 'Coba muat ulang halaman dan login kembali.']}
              />
            )}

            <button
              id="btn-scout-google-login"
              onClick={handleGoogleLogin}
              className="w-full scout-btn-primary py-3.5 text-sm"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.984 0-.743-.08-1.309-.176-1.863H12.24z"/>
              </svg>
              Masuk dengan Google
            </button>

            <button
              id="btn-purna-register"
              type="button"
              onClick={() => setPublicView('purna-register')}
              className="w-full scout-btn-secondary py-3.5 text-sm"
            >
              <Award className="w-4 h-4" />
              Daftar sebagai Purna
            </button>
          </div>

          <div className="px-5 sm:px-8 py-4 bg-bento-soft border-t border-bento-border text-center">
            <span className="text-xs text-bento-muted">ForestBest Scout v1.2.0</span>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser && purnaGate) {
    return <PurnaPendingGate status={purnaGate} />;
  }

  if (currentUser && !userProfile) {
    return <ProfileForm />;
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
                <Compass className="w-4 h-4 text-bento-dark" />
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
