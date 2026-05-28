/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Compass, User, BookOpen, Shield, LogOut, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProfileForm() {
  const { currentUser, registerProfile, logout } = useAuth();
  const [nama, setNama] = useState(currentUser?.displayName || '');
  const [kelas, setKelas] = useState('');
  const [regu, setRegu] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !kelas.trim() || !regu.trim()) {
      setErrorMsg('Semua data wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await registerProfile(nama.trim(), kelas.trim(), regu.trim());
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal mendaftarkan profil. Silakan coba sesi lain.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="scout-registration-flow" className="min-h-screen bg-neutral-50/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl shrink-0 border border-emerald-100 shadow-xl overflow-hidden">
        {/* Aesthetic Forest Style Header */}
        <div className="bg-emerald-950 px-6 py-8 text-center text-white relative flex flex-col items-center">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-emerald-950 opacity-90" />
          <div className="relative z-10 w-14 h-14 bg-emerald-800 rounded-full flex items-center justify-center mb-3 shadow-inner border border-emerald-700">
            <Compass className="w-8 h-8 text-emerald-300 animate-spin-slow" />
          </div>
          <h2 className="relative z-10 text-xl font-extrabold tracking-tight font-sans">
            Lengkapi Profil Pramuka
          </h2>
          <p className="relative z-10 text-xs text-emerald-200 mt-1 max-w-xs leading-normal font-sans">
            Selamat datang di ForestBest Scout! Selesaikan profil keanggotaan Anda sebelum menggunakan sistem absensi digital.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Email placeholder (read-only verification badge) */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">Alamat Email Pramuka</span>
            <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono text-xs font-semibold select-none">
              {currentUser?.email}
            </div>
          </div>

          {/* Full Name input */}
          <div className="space-y-1">
            <label htmlFor="reg-name-field" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">Nama Lengkap Anggota</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <User className="h-4.5 w-4.5 text-slate-400" />
              </span>
              <input
                id="reg-name-field"
                type="text"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent rounded-xl text-sm font-sans placeholder-slate-400"
                placeholder="Contoh: Rahmat Hariadi"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Class input */}
            <div className="space-y-1">
              <label htmlFor="reg-class-field" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">Kelas sekolah</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <BookOpen className="h-4.5 w-4.5 text-slate-400" />
                </span>
                <input
                  id="reg-class-field"
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent rounded-xl text-sm font-sans placeholder-slate-400"
                  placeholder="Contoh: XI IPA 3"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {/* Scout Patrol Squad input */}
            <div className="space-y-1">
              <label htmlFor="reg-squad-field" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">Regu Pramuka</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Shield className="h-4.5 w-4.5 text-slate-400" />
                </span>
                <input
                  id="reg-squad-field"
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent rounded-xl text-sm font-sans placeholder-slate-400"
                  placeholder="Contoh: Elang / Mawar"
                  value={regu}
                  onChange={(e) => setRegu(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex flex-col gap-2">
            <button
              id="btn-submit-registration"
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs tracking-wide uppercase transition shadow-sm active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Simpan & Beres'
              )}
            </button>
            <button
              id="btn-cancel-logout"
              type="button"
              onClick={logout}
              disabled={submitting}
              className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl text-xs tracking-wide uppercase transition flex items-center justify-center gap-1.5 border border-slate-200/55 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Batal & Keluar Sesi
            </button>
          </div>
        </form>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-1 text-[10px] text-slate-400 font-sans">
          <span>Dibuat dengan dedikasi pramuka</span>
          <Heart className="w-3 h-3 text-red-400 fill-current animate-pulse" />
        </div>
      </div>
    </div>
  );
}
