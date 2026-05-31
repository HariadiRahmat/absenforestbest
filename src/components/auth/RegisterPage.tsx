/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthCardLayout, AuthDivider, PasswordField } from './AuthCardLayout';
import { Alert } from '../ui/Alert';
import { GoogleIcon } from '../ui/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { getEmailAuthErrorMessage, getGoogleSignInErrorMessage } from '../../lib/authErrors';
import {
  PASSWORD_HINT,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
} from '../../lib/passwordValidation';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
  onBack?: () => void;
  initialEmail?: string;
  lockEmail?: boolean;
  onSubmitted?: () => void | Promise<void>;
  onGoogleLogin?: () => Promise<void>;
}

export function RegisterPage({
  onSwitchToLogin,
  onBack,
  initialEmail = '',
  lockEmail = false,
  onSubmitted,
  onGoogleLogin,
}: RegisterPageProps) {
  const { registerWithEmailPassword, submitPendingRegistration } = useAuth();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isGoogleLinkMode = lockEmail && Boolean(onSubmitted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrorMsg(emailErr);
      return;
    }
    if (!nama.trim()) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }

    if (!isGoogleLinkMode) {
      const passErr = validatePassword(password) || validatePasswordConfirm(password, confirmPassword);
      if (passErr) {
        setErrorMsg(passErr);
        return;
      }
      if (!agreeTerms) {
        setErrorMsg('Anda harus menyetujui syarat & privasi.');
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (isGoogleLinkMode) {
        await submitPendingRegistration(email, nama);
        await onSubmitted?.();
        setSubmitted(true);
        return;
      }

      await registerWithEmailPassword(email, password, nama);
    } catch (err) {
      setErrorMsg(getEmailAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!onGoogleLogin) return;
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      await onGoogleLogin();
    } catch (err) {
      setErrorMsg(getGoogleSignInErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  if (submitted && isGoogleLinkMode) {
    return (
      <div className="scout-auth-page">
        <div className="max-w-md w-full scout-card p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-bento-accent rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-bento-dark" />
          </div>
          <h2 className="text-xl font-bold text-bento-text">Pendaftaran Terkirim</h2>
          <p className="text-sm text-bento-muted mt-3 leading-relaxed">
            Pembina akan meninjau pendaftaran Anda. Setelah disetujui, Anda akan masuk otomatis.
          </p>
          <button type="button" onClick={() => void onSubmitted?.()} className="w-full scout-btn-primary mt-6 py-3.5 text-sm">
            Lanjutkan
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthCardLayout
      title={isGoogleLinkMode ? 'Lengkapi Pendaftaran' : 'Buat Akun Baru'}
      subtitle={
        isGoogleLinkMode
          ? 'Lengkapi data pendaftaran agar Pembina dapat memvalidasi akun Google Anda.'
          : 'Daftar dengan email & password. Biodata lengkap diisi setelah login pertama kali.'
      }
      brandTitle="Bergabung dengan komunitas ForestBest Scout"
      brandSubtitle="Daftar sekali, tunggu validasi Pembina, lalu lengkapi profil saat login pertama."
      footer={
        !isGoogleLinkMode ? (
          <p className="text-sm text-center text-bento-muted mt-6">
            Sudah punya akun?{' '}
            <button type="button" onClick={onSwitchToLogin} className="font-semibold text-bento-primary hover:underline">
              Masuk
            </button>
          </p>
        ) : onBack ? (
          <button type="button" onClick={onBack} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-bento-muted hover:text-bento-text">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        ) : null
      }
    >
      {errorMsg && <Alert variant="error" title="Gagal mendaftar" message={errorMsg} className="mb-5" onDismiss={() => setErrorMsg(null)} />}

      {!isGoogleLinkMode && (
        <Alert
          variant="info"
          title="Validasi Pembina"
          message="Setelah daftar, akun akan menunggu persetujuan Pembina sebelum bisa masuk ke dashboard."
          className="mb-5"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reg-name" className="scout-auth-label">Nama Lengkap</label>
          <input
            id="reg-name"
            type="text"
            className="scout-auth-input"
            placeholder="Nama lengkap Anda"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            disabled={submitting || googleLoading}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="scout-auth-label">Email</label>
          <input
            id="reg-email"
            type="email"
            className="scout-auth-input"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting || googleLoading || lockEmail}
            readOnly={lockEmail}
            autoComplete="email"
            required
          />
        </div>

        {!isGoogleLinkMode && (
          <>
            <PasswordField
              id="reg-password"
              label="Password"
              value={password}
              onChange={setPassword}
              disabled={submitting || googleLoading}
              hint={PASSWORD_HINT}
              autoComplete="new-password"
            />

            <PasswordField
              id="reg-confirm-password"
              label="Konfirmasi Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={submitting || googleLoading}
              autoComplete="new-password"
            />

            <label className="flex items-start gap-2.5 text-sm text-bento-muted cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded border-bento-border text-bento-primary focus:ring-bento-primary/30"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                disabled={submitting || googleLoading}
              />
              <span>
                Saya setuju dengan{' '}
                <span className="text-bento-primary font-semibold">Syarat & Privasi</span> ForestBest Scout.
              </span>
            </label>
          </>
        )}

        <button type="submit" disabled={submitting || googleLoading} className="scout-auth-submit">
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isGoogleLinkMode ? (
            'Kirim Pendaftaran'
          ) : (
            'Daftar'
          )}
        </button>
      </form>

      {!isGoogleLinkMode && onGoogleLogin && (
        <>
          <AuthDivider />
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting || googleLoading}
            className="scout-btn-google w-full min-h-12"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-bento-border border-t-bento-primary rounded-full animate-spin" />
            ) : (
              <>
                <GoogleIcon size={20} />
                Daftar dengan Google
              </>
            )}
          </button>
        </>
      )}
    </AuthCardLayout>
  );
}
