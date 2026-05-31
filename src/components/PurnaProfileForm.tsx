/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Award,
  User,
  MapPin,
  Calendar,
  BookOpen,
  LogOut,
  Save,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';
import { AGAMA_OPTIONS, STATUS_PERKAWINAN_OPTIONS, purnaFormFromProfile } from '../lib/purnaProfile';

export function PurnaProfileForm() {
  const { currentUser, userProfile, updatePurnaProfile, logout } = useAuth();
  const initial = purnaFormFromProfile(userProfile!);

  const [nama, setNama] = useState(initial.nama || currentUser?.displayName || '');
  const [tanggalLahir, setTanggalLahir] = useState(initial.tanggalLahir);
  const [alamat, setAlamat] = useState(initial.alamat);
  const [agama, setAgama] = useState(initial.agama || AGAMA_OPTIONS[0]);
  const [pendidikanSd, setPendidikanSd] = useState(initial.pendidikanSd);
  const [pendidikanSmp, setPendidikanSmp] = useState(initial.pendidikanSmp);
  const [pendidikanSma, setPendidikanSma] = useState(initial.pendidikanSma);
  const [pendidikanKuliah, setPendidikanKuliah] = useState(initial.pendidikanKuliah);
  const [statusPerkawinan, setStatusPerkawinan] = useState(initial.statusPerkawinan || STATUS_PERKAWINAN_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputClass =
    'w-full px-4 py-3 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary rounded-xl text-sm bg-bento-soft placeholder-bento-muted';
  const labelClass = 'text-[11px] font-semibold text-bento-muted uppercase tracking-wide';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !nama.trim() ||
      !tanggalLahir ||
      !alamat.trim() ||
      !agama ||
      !pendidikanSd.trim() ||
      !pendidikanSmp.trim() ||
      !pendidikanSma.trim() ||
      !statusPerkawinan
    ) {
      setErrorMsg('Lengkapi semua field wajib. Pendidikan kuliah bersifat opsional.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await updatePurnaProfile({
        nama,
        tanggalLahir,
        alamat,
        agama,
        pendidikanSd,
        pendidikanSmp,
        pendidikanSma,
        pendidikanKuliah,
        statusPerkawinan,
      });
    } catch {
      setErrorMsg('Gagal menyimpan profil. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bento-bg flex flex-col py-6 sm:py-10 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="max-w-lg w-full mx-auto scout-card overflow-hidden">
        <div className="px-5 sm:px-8 pt-7 sm:pt-9 pb-5 text-center border-b border-bento-border">
          <div className="w-14 h-14 bg-bento-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-7 h-7 text-bento-dark" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">ForestBest Purna</p>
          <h2 className="text-xl font-bold text-bento-text mt-1">Lengkapi Data Diri</h2>
          <p className="text-sm text-bento-muted mt-2 leading-relaxed">
            Isi biodata purna pramuka sebelum mengakses dokumentasi kegiatan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4 max-h-[calc(100dvh-12rem)] overflow-y-auto">
          {errorMsg && <Alert variant="error" title="Gagal menyimpan" message={errorMsg} />}

          <div className="space-y-1">
            <span className={labelClass}>Email</span>
            <div className="w-full px-4 py-3 bg-bento-soft border border-bento-border rounded-xl text-bento-muted font-mono text-sm truncate">
              {currentUser?.email}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="purna-nama" className={labelClass}>Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
              <input id="purna-nama" type="text" className={`${inputClass} pl-10`} value={nama} onChange={(e) => setNama(e.target.value)} required disabled={submitting} />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="purna-tgl" className={labelClass}>Tanggal Lahir</label>
            <div className="scout-date-field">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted pointer-events-none z-10" />
              <input
                id="purna-tgl"
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
            <label htmlFor="purna-alamat" className={labelClass}>Alamat</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-bento-muted" />
              <textarea id="purna-alamat" className={`${inputClass} pl-10 min-h-[88px] resize-y`} value={alamat} onChange={(e) => setAlamat(e.target.value)} required disabled={submitting} placeholder="Alamat domisili lengkap" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="purna-agama" className={labelClass}>Agama</label>
              <select id="purna-agama" className="scout-select" value={agama} onChange={(e) => setAgama(e.target.value)} disabled={submitting}>
                {AGAMA_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="purna-nikah" className={labelClass}>Status Perkawinan</label>
              <select id="purna-nikah" className="scout-select" value={statusPerkawinan} onChange={(e) => setStatusPerkawinan(e.target.value)} disabled={submitting}>
                {STATUS_PERKAWINAN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-bento-border">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-bento-primary" />
              <p className="text-sm font-bold text-bento-text">Jejak Pendidikan</p>
            </div>
            <div className="space-y-3">
              {[
                { id: 'purna-sd', label: 'SD', value: pendidikanSd, set: setPendidikanSd, required: true },
                { id: 'purna-smp', label: 'SMP', value: pendidikanSmp, set: setPendidikanSmp, required: true },
                { id: 'purna-sma', label: 'SMA', value: pendidikanSma, set: setPendidikanSma, required: true },
                { id: 'purna-kuliah', label: 'Kuliah (opsional)', value: pendidikanKuliah, set: setPendidikanKuliah, required: false },
              ].map(({ id, label, value, set, required }) => (
                <div key={id} className="space-y-1">
                  <label htmlFor={id} className={labelClass}>{label}</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
                    <input
                      id={id}
                      type="text"
                      className={`${inputClass} pl-10`}
                      placeholder={`Nama sekolah / universitas ${label}`}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      required={required}
                      disabled={submitting}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2 sticky bottom-0 bg-white pb-1">
            <button type="submit" disabled={submitting} className="w-full scout-btn-primary py-3.5 text-sm">
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan & Lanjut
                </>
              )}
            </button>
            <button type="button" onClick={logout} disabled={submitting} className="w-full scout-btn-secondary py-3 text-sm">
              <LogOut className="w-4 h-4" />
              Batal & Keluar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
