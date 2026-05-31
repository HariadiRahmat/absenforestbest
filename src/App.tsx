/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProfileForm } from './components/ProfileForm';
import { AdminDashboard } from './components/AdminDashboard';
import { AnggotaDashboard } from './components/AnggotaDashboard';
import { UserRole, UserStatus } from './types';
import { Compass, Sparkles, LogOut, AlertTriangle, ShieldCheck, HelpCircle, Heart } from 'lucide-react';

function ScoutAppContent() {
  const { currentUser, userProfile, loading, signInWithGoogle, logout } = useAuth();
  const [loginError, setLoginError] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch {
      setLoginError('Gagal masuk via Google. Pastikan pop-up tidak diblokir dan coba lagi.');
    }
  };

  // 1. Loading Phase Spinner
  if (loading) {
    return (
      <div id="scout-global-loader" className="min-h-screen bg-bento-bg flex flex-col justify-center items-center text-bento-text font-sans">
        <div className="relative">
          <div className="absolute inset-0 bg-bento-border-green/20 rounded-full animate-ping scale-150 duration-2000" />
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-bento-border-green relative z-10">
            <Compass className="w-8 h-8 text-bento-primary animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>
        <h3 className="mt-4 text-xs font-bold uppercase tracking-widest text-bento-primary">ForestBest Scout</h3>
        <p className="text-[10px] text-bento-muted mt-1 animate-pulse">Menghubungkan ke koordinat satelit...</p>
      </div>
    );
  }

  // 2. Unauthenticated Login Gate
  if (!currentUser) {
    return (
      <div id="scout-gate-login" className="min-h-screen bg-bento-bg flex flex-col justify-between py-10 px-4">
        <div className="max-w-md w-full mx-auto my-auto bg-white rounded-[32px] border border-bento-border shadow-sm overflow-hidden animate-fade-in">
          
          {/* Immersive Scout Banner Cover */}
          <div className="bg-bento-primary px-6 py-10 text-center relative flex flex-col items-center">
            {/* Background design elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-bento-primary to-bento-primary-hover opacity-95" />
            
            {/* Animated Compass Crest Emblem */}
            <div className="relative z-10 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20 shadow-inner">
              <Compass className="w-9 h-9 text-bento-highlight rotate-45 animate-pulse" />
            </div>

            <span className="relative z-10 text-[10px] font-bold tracking-wider text-bento-highlight uppercase font-mono">
              SISTEM PRESENSI PERSATUAN KEPANDUAN
            </span>
            <h1 className="relative z-10 text-2xl font-black text-white tracking-tight font-sans mt-1">
              ForestBest Scout
            </h1>
            <p className="relative z-10 text-xs text-white/80 mt-1.5 max-w-sm font-sans leading-normal">
              Solusi absensi digital dinamis berbasis QR Code dan pendeteksian letak geospasial pramuka.
            </p>
          </div>

          <div className="p-8 space-y-6">
            
            {/* Core Features Overview cards */}
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-3.5 bg-bento-soft rounded-2xl border border-bento-border/40">
                <div className="p-2 bg-[#2D5A27]/10 text-[#2D5A27] rounded-lg shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-bento-text">QR Code Dinamis</h4>
                  <p className="text-[10px] text-bento-muted font-sans mt-0.5 leading-normal">
                    Keamanan tingkat tinggi dengan token harian yang hangus otomatis setiap tengah malam (rotation token).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-bento-soft rounded-2xl border border-bento-border/40">
                <div className="p-2 bg-[#2D5A27]/10 text-[#2D5A27] rounded-lg shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-bento-text">Geolokasi & Anti-Kecurangan</h4>
                  <p className="text-[10px] text-bento-muted font-sans mt-0.5 leading-normal">
                    Mencatat koordinat GPS saat scan untuk membuktikan kehadiran fisik nyata anggota di lapangan.
                  </p>
                </div>
              </div>
            </div>

            {/* Google Sign-In Primary Action */}
            <div className="pt-2 space-y-3">
              {loginError && (
                <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs font-semibold">
                  {loginError}
                </div>
              )}
              <button
                id="btn-scout-google-login"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 py-4 px-4 bg-bento-primary hover:bg-bento-primary-hover duration-150 text-white font-bold rounded-2xl text-xs tracking-wider uppercase font-sans shadow shadow-bento-primary-hover/10 active:scale-98 cursor-pointer border border-bento-primary shadow-sm"
              >
                {/* Visual custom clean Google Emblem */}
                <svg className="w-4 h-4 fill-current shrink-0 text-white" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.984 0-.743-.08-1.309-.176-1.863H12.24z"/>
                </svg>
                Masuk via Google Akun
              </button>
            </div>

          </div>

          {/* Scout pledge footnote */}
          <div className="bg-bento-soft/80 px-6 py-4 border-t border-bento-border flex items-center justify-center gap-1.5">
            <span className="text-[10px] text-bento-muted font-sans font-medium">Sistem Absensi Resmi Pramuka</span>
            <ShieldCheck className="w-3.5 h-3.5 text-bento-primary" />
          </div>

        </div>

        {/* Global layout developer badge */}
        <div className="text-center text-[10px] text-bento-muted mt-4 font-sans">
          Dikelola mandiri • ForestBest Scout v1.2.0
        </div>
      </div>
    );
  }

  // 3. Authenticated but lacks scout profile setup
  if (currentUser && !userProfile) {
    return <ProfileForm />;
  }

  // 4. Inactive Account Guard Filter
  if (userProfile && userProfile.status === UserStatus.NON_AKTIF) {
    return (
      <div id="scout-gate-disabled" className="min-h-screen bg-slate-50/50 flex flex-col justify-center py-12 px-4">
        <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-red-100 p-8 text-center shadow-md">
          <div className="w-16 h-16 bg-red-50 text-red-800 rounded-full flex items-center justify-center mb-4 mx-auto border border-red-100">
            <AlertTriangle className="w-9 h-9 text-red-700 animate-pulse" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-800 font-sans">
            Akun Kepanduan Dinonaktifkan
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
            Maaf, profil pramuka milik <span className="font-extrabold text-slate-700">{userProfile.nama}</span> ditandai nonaktif oleh Pembina.
            Silakan hubungi Pembina atau staf kesiswaan Anda untuk mengaktifkan kembali akses.
          </p>

          <div className="pt-6 border-t border-slate-100 mt-6 flex flex-col gap-2">
            <button
              id="btn-scout-disabled-logout"
              onClick={logout}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs uppercase transition cursor-pointer"
            >
              Keluar Sesi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. User Role Route Routing (Admin vs Member)
  if (userProfile && userProfile.role === UserRole.ADMIN) {
    return (
      <div id="scout-root-admin">
        {/* Simple Common Admin top bar */}
        <div className="bg-emerald-950 text-white border-b border-emerald-900/60 px-4 py-3">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
              <Compass className="w-4 h-4 animate-spin-slow" />
              SISTEM SCOUT PEMBINA ACTIVE
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-100 font-semibold">{userProfile.nama} (Pembina)</span>
              <button
                id="btn-admin-inner-logout"
                onClick={logout}
                className="p-1 px-2.5 bg-white/10 hover:bg-white/15 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  // 6. Default standard Anggota path
  return <AnggotaDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <ScoutAppContent />
    </AuthProvider>
  );
}
