/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import {
  Award,
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  BookOpen,
  GraduationCap,
  Mail,
  Send,
  CheckCircle,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { PurnaApprovalStatus } from '../types';
import { AGAMA_OPTIONS, STATUS_PERKAWINAN_OPTIONS } from '../lib/purnaProfile';
import { Alert } from './ui/Alert';

interface PurnaRegistrationLandingProps {
  onBack: () => void;
}

export function PurnaRegistrationLanding({ onBack }: PurnaRegistrationLandingProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [nama, setNama] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [alamat, setAlamat] = useState('');
  const [agama, setAgama] = useState<string>(AGAMA_OPTIONS[0]);
  const [pendidikanSd, setPendidikanSd] = useState('');
  const [pendidikanSmp, setPendidikanSmp] = useState('');
  const [pendidikanSma, setPendidikanSma] = useState('');
  const [pendidikanKuliah, setPendidikanKuliah] = useState('');
  const [statusPerkawinan, setStatusPerkawinan] = useState<string>(STATUS_PERKAWINAN_OPTIONS[0]);

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
    if (
      !nama.trim() ||
      !tanggalLahir ||
      !alamat.trim() ||
      !pendidikanSd.trim() ||
      !pendidikanSmp.trim() ||
      !pendidikanSma.trim()
    ) {
      setErrorMsg('Lengkapi semua field wajib. Pendidikan kuliah bersifat opsional.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const regRef = doc(db, 'purna_registrations', emailKey);
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

      const payload = {
        email: emailKey,
        nama: nama.trim(),
        tanggalLahir,
        alamat: alamat.trim(),
        agama,
        pendidikanSd: pendidikanSd.trim(),
        pendidikanSmp: pendidikanSmp.trim(),
        pendidikanSma: pendidikanSma.trim(),
        pendidikanKuliah: pendidikanKuliah.trim() || '',
        statusPerkawinan,
        approvalStatus: PurnaApprovalStatus.PENDING,
        submittedAt: serverTimestamp(),
      };

      await setDoc(regRef, payload);

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      if (err instanceof FirebaseError) {
        if (err.code === 'permission-denied') {
          setErrorMsg(
            'Akses ditolak. Pastikan firestore.rules sudah di-Publish di Firebase Console, atau email sudah terdaftar / menunggu konfirmasi.'
          );
          return;
        }
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
            Data Anda sedang ditinjau Pembina. Setelah disetujui, login dengan Google menggunakan email{' '}
            <span className="font-mono text-bento-text">{email.trim().toLowerCase()}</span>.
          </p>
          <button type="button" onClick={onBack} className="w-full scout-btn-primary mt-6 py-3.5 text-sm">
            Kembali ke Halaman Login
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
              <Award className="w-6 h-6 text-bento-dark" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">ForestBest Scout</p>
              <h1 className="text-xl sm:text-2xl font-bold text-bento-text leading-tight">Registrasi Purna</h1>
            </div>
          </div>
          <p className="text-[13px] sm:text-sm text-bento-muted mt-3 leading-relaxed">
            Isi biodata alumni. Akun aktif setelah Pembina mengkonfirmasi pendaftaran.
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
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-nama" className={labelClass}>Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
              <input id="reg-nama" type="text" className={`${inputClass} pl-10`} value={nama} onChange={(e) => setNama(e.target.value)} required disabled={submitting} />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-tgl" className={labelClass}>Tanggal Lahir</label>
            <div className="scout-date-field">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted pointer-events-none z-10" />
              <input
                id="reg-tgl"
                type="date"
                className={`${inputClass} scout-date-input pl-10`}
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-alamat" className={labelClass}>Alamat</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-bento-muted" />
              <textarea id="reg-alamat" className={`${inputClass} pl-10 min-h-[80px] resize-y`} value={alamat} onChange={(e) => setAlamat(e.target.value)} required disabled={submitting} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="reg-agama" className={labelClass}>Agama</label>
              <select id="reg-agama" className="scout-select bg-white" value={agama} onChange={(e) => setAgama(e.target.value)} disabled={submitting}>
                {AGAMA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="reg-nikah" className={labelClass}>Status Perkawinan</label>
              <select id="reg-nikah" className="scout-select bg-white" value={statusPerkawinan} onChange={(e) => setStatusPerkawinan(e.target.value)} disabled={submitting}>
                {STATUS_PERKAWINAN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-bento-border space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-bento-primary" />
              <p className="text-sm font-bold text-bento-text">Jejak Pendidikan</p>
            </div>
            {[
              { id: 'reg-sd', label: 'SD', value: pendidikanSd, set: setPendidikanSd, req: true },
              { id: 'reg-smp', label: 'SMP', value: pendidikanSmp, set: setPendidikanSmp, req: true },
              { id: 'reg-sma', label: 'SMA', value: pendidikanSma, set: setPendidikanSma, req: true },
              { id: 'reg-kuliah', label: 'Kuliah (opsional)', value: pendidikanKuliah, set: setPendidikanKuliah, req: false },
            ].map(({ id, label, value, set, req }) => (
              <div key={id} className="space-y-1">
                <label htmlFor={id} className={labelClass}>{label}</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
                  <input id={id} type="text" className={`${inputClass} pl-10`} value={value} onChange={(e) => set(e.target.value)} required={req} disabled={submitting} />
                </div>
              </div>
            ))}
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
