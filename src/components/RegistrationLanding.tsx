/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import {
  UserPlus,
  ArrowLeft,
  User,
  Mail,
  Send,
  CheckCircle,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { PurnaApprovalStatus } from '../types';
import { Alert } from './ui/Alert';

interface RegistrationLandingProps {
  onBack: () => void;
  initialEmail?: string;
  lockEmail?: boolean;
  onSubmitted?: () => void | Promise<void>;
}

export function RegistrationLanding({ onBack, initialEmail = '', lockEmail = false, onSubmitted }: RegistrationLandingProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [email, setEmail] = useState(initialEmail);
  const [nama, setNama] = useState('');

  const inputClass =
    'w-full px-4 py-3 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary rounded-xl text-sm bg-white placeholder-bento-muted';
  const labelClass = 'text-[11px] font-semibold text-bento-muted uppercase tracking-wide';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailKey = email.trim().toLowerCase();

    if (!emailKey.includes('@')) {
      setErrorMsg('Format email tidak valid.');
      return;
    }
    if (!nama.trim()) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const regRef = doc(db, 'purna_registrations', emailKey);

      try {
        const existingSnap = await getDoc(regRef);
        if (existingSnap.exists()) {
          const existingStatus = String(existingSnap.data()?.approvalStatus ?? 'pending').toLowerCase();
          if (existingStatus === 'pending') {
            setErrorMsg('Email ini sudah terdaftar dan menunggu konfirmasi Pembina.');
            return;
          }
          if (existingStatus === 'approved') {
            setErrorMsg('Email sudah disetujui. Silakan login dengan Google menggunakan email tersebut.');
            return;
          }
        }
      } catch (readErr) {
        console.warn('Registration pre-check skipped:', readErr);
      }

      await setDoc(regRef, {
        email: emailKey,
        nama: nama.trim(),
        approvalStatus: PurnaApprovalStatus.PENDING,
        submittedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      if (err instanceof FirebaseError && err.code === 'permission-denied') {
        setErrorMsg(
          'Akses ditolak. Publish firestore.rules terbaru di Firebase Console, atau email sudah terdaftar.'
        );
        return;
      }
      setErrorMsg('Gagal mengirim pendaftaran. Periksa koneksi dan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-bento-bg flex flex-col justify-center py-8 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md w-full mx-auto scout-card p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-bento-accent rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-bento-dark" />
          </div>
          <h2 className="text-xl font-bold text-bento-text">Pendaftaran Terkirim</h2>
          <p className="text-sm text-bento-muted mt-3 leading-relaxed">
            Pembina akan meninjau dan menetapkan role Anda (Anggota, Pembina, atau Purna).
            Setelah disetujui, login dengan Google menggunakan{' '}
            <span className="font-mono text-bento-text">{email.trim().toLowerCase()}</span>.
            Biodata lengkap akan diisi saat login pertama kali.
          </p>
          <button
            type="button"
            onClick={() => {
              if (onSubmitted) {
                void onSubmitted();
                return;
              }
              onBack();
            }}
            className="w-full scout-btn-primary mt-6 py-3.5 text-sm"
          >
            {onSubmitted ? 'Lanjutkan' : 'Kembali ke Halaman Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scout-welcome-shell">
      <header className="scout-welcome-hero pb-8">
        <div className="scout-welcome-hero-bg" aria-hidden />
        <div className="relative max-w-lg mx-auto text-left">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-bento-muted mb-4 -ml-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-bento-accent rounded-2xl flex items-center justify-center shrink-0 border border-white/60">
              <UserPlus className="w-6 h-6 text-bento-dark" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">ForestBest Scout</p>
              <h1 className="text-xl sm:text-2xl font-bold text-bento-text leading-tight">Daftar Akun</h1>
            </div>
          </div>
          <p className="text-[13px] sm:text-sm text-bento-muted mt-3 leading-relaxed">
            Cukup isi email dan nama. Biodata lengkap akan dilengkapi setelah Pembina menyetujui dan Anda login pertama kali.
          </p>
        </div>
      </header>

      <main className="scout-welcome-body">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto w-full space-y-3.5 sm:space-y-4">
          {errorMsg && <Alert variant="error" title="Gagal mendaftar" message={errorMsg} />}

          <Alert
            variant="info"
            title="Catatan penting"
            message="Gunakan email Google yang sama saat login nanti. Pendaftaran akan ditinjau Pembina terlebih dahulu."
          />

          <div className="space-y-1">
            <label htmlFor="reg-email" className={labelClass}>Email Google</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
              <input
                id="reg-email"
                type="email"
                className={`${inputClass} pl-10`}
                placeholder="email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting || lockEmail}
                readOnly={lockEmail}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-nama" className={labelClass}>Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
              <input
                id="reg-nama"
                type="text"
                className={`${inputClass} pl-10`}
                placeholder="Nama sesuai Google"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full scout-btn-primary min-h-12 text-sm mt-2">
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Kirim Pendaftaran
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
