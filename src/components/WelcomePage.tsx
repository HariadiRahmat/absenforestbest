/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Award,
  Compass,
  FileText,
  QrCode,
  Shield,
  Users,
} from 'lucide-react';
import { Alert } from './ui/Alert';
import { GoogleIcon } from './ui/GoogleIcon';

interface WelcomePageProps {
  loginError: string | null;
  authError: string | null;
  onLogin: () => void;
  onPurnaRegister: () => void;
}

const pillars = [
  {
    icon: QrCode,
    title: 'Absensi',
    titleDesktop: 'Absensi Anggota',
    desc: 'Check-in harian via QR dinamis dan verifikasi lokasi GPS.',
    accent: 'bg-bento-highlight text-bento-primary',
  },
  {
    icon: Shield,
    title: 'Pembina',
    titleDesktop: 'Panel Pembina',
    desc: 'Kelola keanggotaan, absensi real-time, dan pengaturan latihan.',
    accent: 'bg-bento-accent text-bento-dark',
  },
  {
    icon: FileText,
    title: 'Purna',
    titleDesktop: 'Portal Purna',
    desc: 'Akses dokumentasi kegiatan dan data alumni ForestBest Scout.',
    accent: 'bg-white text-bento-text border border-bento-border',
  },
];

export function WelcomePage({ loginError, authError, onLogin, onPurnaRegister }: WelcomePageProps) {
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
            <Compass className="w-7 h-7 sm:w-8 sm:h-8 text-bento-dark" />
          </div>

          <h1 className="text-[1.625rem] sm:text-3xl font-bold text-bento-text tracking-tight leading-tight px-2">
            ForestBest Scout
          </h1>
          <p className="text-[13px] sm:text-base text-bento-muted mt-2 leading-relaxed max-w-[280px] sm:max-w-sm mx-auto px-1">
            Platform untuk anggota aktif, pembina, dan alumni Purna.
          </p>
        </div>
      </header>

      <main className="scout-welcome-body">
        <div className="max-w-lg mx-auto w-full">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-bento-muted mb-3 sm:mb-4">
            Layanan platform
          </p>

          <div className="scout-welcome-pillars">
            {pillars.map(({ icon: Icon, title, titleDesktop, desc, accent }) => (
              <div key={title} className="scout-welcome-pillar">
                <div className={`scout-welcome-pillar-icon ${accent}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="scout-welcome-pillar-title sm:hidden">{title}</p>
                  <p className="scout-welcome-pillar-title hidden sm:block">{titleDesktop}</p>
                  <p className="scout-welcome-pillar-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-bento-border pt-4 sm:pt-5">
            <div className="text-center mb-4">
              <p className="text-[15px] sm:text-base font-bold text-bento-text">Masuk ke akun</p>
              <p className="text-xs text-bento-muted mt-1">
                Untuk anggota, pembina, dan purna terdaftar
              </p>
            </div>

            {(loginError || authError) && (
              <Alert
                variant="error"
                title="Gagal masuk"
                message={loginError || authError || undefined}
                tips={['Pastikan akun Google sudah terdaftar.', 'Purna baru menunggu konfirmasi admin.']}
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
                id="btn-purna-register"
                type="button"
                onClick={onPurnaRegister}
                className="scout-btn-secondary"
              >
                <Award className="w-[18px] h-[18px]" />
                Daftar sebagai Purna
              </button>

              <p className="text-[11px] text-bento-muted text-center leading-relaxed pt-1 px-1">
                Pendaftaran Purna perlu konfirmasi admin sebelum bisa login.
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
