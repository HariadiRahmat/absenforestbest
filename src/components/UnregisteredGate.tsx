/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogOut, ShieldAlert, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';
import { RegisterPage } from './auth/RegisterPage';

export function UnregisteredGate() {
  const { logout, currentUser, retryProfileSetup, signInWithGoogle } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  const handleGoogleRegister = async () => {
    await signInWithGoogle();
  };

  if (showRegister) {
    return (
      <RegisterPage
        onSwitchToLogin={() => setShowRegister(false)}
        onBack={() => setShowRegister(false)}
        initialEmail={currentUser?.email ?? ''}
        lockEmail={Boolean(currentUser?.email)}
        onSubmitted={() => retryProfileSetup()}
        onGoogleLogin={handleGoogleRegister}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-8 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md w-full mx-auto scout-card p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-bento-soft border border-bento-border flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-bento-primary" />
        </div>

        <h2 className="text-xl font-bold text-bento-text">Akun Belum Terdaftar</h2>
        <p className="text-sm text-bento-muted mt-3 leading-relaxed">
          <span className="font-mono text-bento-text">{currentUser?.email}</span>
        </p>

        <Alert
          variant="warning"
          title="Email Anda belum terdaftar."
          message="Daftar terlebih dahulu agar Pembina dapat memvalidasi akun Anda."
          className="mb-6 mt-5 text-left"
        />

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="w-full scout-btn-primary py-3 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Daftar Sekarang
          </button>

          <button type="button" onClick={logout} className="w-full scout-btn-secondary py-3 text-sm">
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
