/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthCardLayout, AuthDivider, PasswordField } from './AuthCardLayout';
import { Alert } from '../ui/Alert';
import { GoogleIcon } from '../ui/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { getEmailAuthErrorMessage, getGoogleSignInErrorMessage } from '../../lib/authErrors';
import { validateEmail } from '../../lib/passwordValidation';
import { parseAuthAlertMessage } from '../../lib/friendlyErrors';

interface LoginPageProps {
  loginError: string | null;
  authError: string | null;
  onSwitchToRegister: () => void;
  onGoogleLogin: () => Promise<void>;
  onDismissError?: () => void;
}

export function LoginPage({
  loginError,
  authError,
  onSwitchToRegister,
  onGoogleLogin,
  onDismissError,
}: LoginPageProps) {
  const { signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const rawError = formError || loginError || authError;
  const errorDetail = parseAuthAlertMessage(rawError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setFormError(emailErr);
      return;
    }
    if (!password) {
      setFormError('Password wajib diisi.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    onDismissError?.();

    try {
      await signInWithEmailPassword(email, password);
    } catch (err) {
      setFormError(getEmailAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setFormError(null);
    onDismissError?.();
    try {
      await onGoogleLogin();
    } catch (err) {
      setFormError(getGoogleSignInErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthCardLayout
      title="Masuk ke Akun"
      subtitle="Login dengan email & password atau Google setelah akun disetujui Pembina."
      footer={
        <p className="text-sm text-center text-bento-muted mt-6">
          Belum punya akun?{' '}
          <button type="button" onClick={onSwitchToRegister} className="font-semibold text-bento-primary hover:underline">
            Daftar
          </button>
        </p>
      }
    >
      {rawError && (
        <Alert
          variant="error"
          title={errorDetail.title}
          message={errorDetail.message || rawError}
          tips={errorDetail.tips}
          className="mb-5"
          onDismiss={() => {
            setFormError(null);
            onDismissError?.();
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="scout-auth-label">Email</label>
          <input
            id="login-email"
            type="email"
            className="scout-auth-input"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting || googleLoading}
            autoComplete="email"
            required
          />
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          disabled={submitting || googleLoading}
          autoComplete="current-password"
        />

        <button type="submit" disabled={submitting || googleLoading} className="scout-auth-submit">
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Masuk'
          )}
        </button>
      </form>

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
            Masuk dengan Google
          </>
        )}
      </button>

      <p className="text-[11px] text-bento-muted text-center leading-relaxed mt-4">
        User baru wajib menunggu validasi Pembina sebelum bisa mengakses dashboard.
      </p>
    </AuthCardLayout>
  );
}
