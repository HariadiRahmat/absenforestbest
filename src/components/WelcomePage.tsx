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

interface WelcomePageProps {
  loginError: string | null;
  authError: string | null;
  onLogin: () => void;
  onPurnaRegister: () => void;
}

const pillars = [
  {
    icon: QrCode,
    title: 'Absensi Anggota',
    desc: 'Check-in harian via QR dinamis dan verifikasi lokasi GPS.',
    accent: 'bg-bento-highlight text-bento-primary',
  },
  {
    icon: Shield,
    title: 'Panel Pembina',
    desc: 'Kelola keanggotaan, absensi real-time, dan pengaturan latihan.',
    accent: 'bg-bento-accent text-bento-dark',
  },
  {
    icon: FileText,
    title: 'Portal Purna',
    desc: 'Akses dokumentasi kegiatan dan data alumni ForestBest Scout.',
    accent: 'bg-bento-soft text-bento-text border border-bento-border',
  },
];

export function WelcomePage({ loginError, authError, onLogin, onPurnaRegister }: WelcomePageProps) {
  return (
    <div id="scout-welcome-page" className="min-h-screen bg-bento-bg flex flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bento-highlight via-bento-bg to-bento-accent/20 pointer-events-none" />
        <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-bento-accent/25 blur-3xl pointer-events-none" />
        <div className="absolute top-32 -left-20 w-48 h-48 rounded-full bg-bento-primary/10 blur-3xl pointer-events-none" />

        <div className="relative scout-page max-w-lg mx-auto px-4 pt-10 sm:pt-14 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-bento-border text-[11px] font-semibold text-bento-muted mb-6 backdrop-blur-sm">
            <Users className="w-3.5 h-3.5 text-bento-primary" />
            Platform Komunitas Pramuka
          </div>

          <div className="w-16 h-16 bg-bento-accent rounded-[1.25rem] flex items-center justify-center mx-auto mb-5 shadow-sm border border-bento-accent-muted/50">
            <Compass className="w-8 h-8 text-bento-dark" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-bento-text tracking-tight leading-tight">
            ForestBest Scout
          </h1>
          <p className="text-sm sm:text-base text-bento-muted mt-3 leading-relaxed max-w-sm mx-auto">
            Satu platform untuk anggota aktif, pembina, dan alumni Purna ForestBest Scout.
          </p>
        </div>
      </div>

      <div className="flex-1 scout-page max-w-lg mx-auto w-full px-4 -mt-2">
        <div className="space-y-2.5 mb-6">
          {pillars.map(({ icon: Icon, title, desc, accent }) => (
            <div
              key={title}
              className="flex items-start gap-3.5 p-4 bg-white rounded-2xl border border-bento-border shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <h2 className="text-sm font-bold text-bento-text">{title}</h2>
                <p className="text-xs text-bento-muted mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="scout-card p-5 sm:p-6 space-y-4">
          <div className="text-center pb-1">
            <p className="text-sm font-bold text-bento-text">Masuk ke akun Anda</p>
            <p className="text-xs text-bento-muted mt-1">
              Anggota, Pembina, dan Purna yang sudah terdaftar
            </p>
          </div>

          {(loginError || authError) && (
            <Alert
              variant="error"
              title="Gagal masuk"
              message={loginError || authError || undefined}
              tips={['Pastikan akun Google Anda sudah terdaftar.', 'Purna baru harus menunggu konfirmasi admin.']}
            />
          )}

          <button
            id="btn-scout-google-login"
            type="button"
            onClick={onLogin}
            className="w-full scout-btn-primary py-3.5 text-sm"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.984 0-.743-.08-1.309-.176-1.863H12.24z" />
            </svg>
            Masuk dengan Google
          </button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-bento-border" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">atau</span>
            <div className="flex-1 h-px bg-bento-border" />
          </div>

          <button
            id="btn-purna-register"
            type="button"
            onClick={onPurnaRegister}
            className="w-full scout-btn-secondary py-3.5 text-sm"
          >
            <Award className="w-4 h-4" />
            Daftar sebagai Purna
          </button>

          <p className="text-[11px] text-bento-muted text-center leading-relaxed pt-1">
            Belum punya akun Purna? Isi formulir pendaftaran — admin akan konfirmasi sebelum Anda bisa login.
          </p>
        </div>

        <p className="text-center text-[11px] text-bento-muted mt-6">
          ForestBest Scout · v1.3.0
        </p>
      </div>
    </div>
  );
}
