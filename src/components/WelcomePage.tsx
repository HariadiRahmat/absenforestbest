/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileText,
  QrCode,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import { Alert } from './ui/Alert';
import { GoogleIcon } from './ui/GoogleIcon';

interface WelcomePageProps {
  loginError: string | null;
  authError: string | null;
  onLogin: () => void;
  onRegister: () => void;
}

const services = [
  {
    icon: QrCode,
    title: 'Absensi',
    accent: 'bg-bento-highlight text-bento-primary',
  },
  {
    icon: FileText,
    title: 'Purna',
    accent: 'bg-white text-bento-text border border-bento-border',
  },
];

export function WelcomePage({ loginError, authError, onLogin, onRegister }: WelcomePageProps) {
  return (
    <div id="scout-welcome-page" className="scout-welcome-shell">
      <header className="scout-welcome-hero">
        <div className="scout-welcome-hero-bg" aria-hidden />
        <div className="relative max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-bento-border text-[10px] sm:text-[11px] font-semibold text-bento-muted mb-4 backdrop-blur-sm">
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-bento-primary shrink-0" />
            ForestBest Data Center
          </div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-bento-accent rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-white/60">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-bento-dark" />
          </div>

          <h1 className="text-[1.625rem] sm:text-3xl font-bold text-bento-text tracking-tight leading-tight px-2">
            ForestBest Scout
          </h1>
          <p className="text-[13px] sm:text-base text-bento-muted mt-2 leading-relaxed max-w-[280px] sm:max-w-sm mx-auto px-1">
            Platform untuk anggota aktif, pembina, dan purna.
          </p>
        </div>
      </header>

      <main className="scout-welcome-body">
        <div className="max-w-lg mx-auto w-full">
          <div className="hidden sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-bento-muted mb-3 sm:mb-4">
              Layanan platform
            </p>

            <div className="scout-welcome-services">
              {services.map(({ icon: Icon, title, accent }) => (
                <div key={title} className="scout-welcome-service">
                  <div className={`scout-welcome-service-icon ${accent}`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="scout-welcome-service-label">{title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:border-t sm:border-bento-border sm:pt-5">
            <div className="text-center mb-4">
              <p className="text-[15px] sm:text-base font-bold text-bento-text">Masuk ke akun</p>
              <p className="text-xs text-bento-muted mt-1">
                Sudah disetujui Pembina? Login dengan Google.
              </p>
            </div>

            {(loginError || authError) && (
              <Alert
                variant="error"
                title="Gagal masuk"
                message={loginError || authError || undefined}
                tips={['Belum punya akun? Daftar dulu lalu tunggu konfirmasi Pembina.']}
                className="mb-4"
              />
            )}

            <div className="scout-welcome-actions">
              <button
                id="btn-scout-google-login"
                type="button"
                onClick={onLogin}
                className="scout-btn-google"
              >
                <GoogleIcon size={20} />
                Masuk dengan Google
              </button>

              <div className="scout-welcome-divider">
                <span>atau</span>
              </div>

              <button
                id="btn-scout-register"
                type="button"
                onClick={onRegister}
                className="scout-btn-secondary"
              >
                <UserPlus className="w-[18px] h-[18px]" />
                Daftar
              </button>

              <p className="text-[11px] text-bento-muted text-center leading-relaxed pt-1 px-1">
                User baru wajib daftar dan menunggu validasi Pembina sebelum bisa login.
              </p>
            </div>
          </div>

          <p className="text-center text-[10px] sm:text-[11px] text-bento-muted mt-5 pb-1">
            ForestBest Scout · v1.3.0
          </p>
        </div>
      </main>
    </div>
  );
}
