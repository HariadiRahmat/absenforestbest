/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, User, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';

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
      setErrorMsg('Gagal mendaftarkan profil. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full pl-10 pr-4 py-3 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary rounded-2xl text-sm bg-bento-soft placeholder-bento-muted';

  return (
    <div id="scout-registration-flow" className="min-h-screen bg-bento-bg flex flex-col justify-center py-8 sm:py-12 px-4">
      <div className="max-w-md w-full mx-auto scout-card overflow-hidden">
        <div className="px-5 sm:px-8 pt-8 sm:pt-10 pb-6 text-center border-b border-bento-border">
          <div className="w-14 h-14 bg-bento-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-bento-dark" />
          </div>
          <h2 className="text-xl font-bold text-bento-text">Lengkapi Profil</h2>
          <p className="text-sm text-bento-muted mt-2 leading-relaxed">
            Isi data keanggotaan pramuka sebelum menggunakan sistem absensi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5">
          {errorMsg && (
            <Alert variant="error" title="Gagal menyimpan" message={errorMsg} />
          )}

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">Email</span>
            <div className="w-full px-4 py-3 bg-bento-soft border border-bento-border rounded-2xl text-bento-muted font-mono text-sm">
              {currentUser?.email}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-name-field" className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">
              Nama Lengkap
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <User className="h-4 w-4 text-bento-muted" />
              </span>
              <input
                id="reg-name-field"
                type="text"
                className={inputClass}
                placeholder="Contoh: Rahmat Hariadi"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="reg-class-field" className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">
                Kelas
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <BookOpen className="h-4 w-4 text-bento-muted" />
                </span>
                <input
                  id="reg-class-field"
                  type="text"
                  className={inputClass}
                  placeholder="XI IPA 3"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="reg-squad-field" className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">
                Regu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Shield className="h-4 w-4 text-bento-muted" />
                </span>
                <input
                  id="reg-squad-field"
                  type="text"
                  className={inputClass}
                  placeholder="Elang"
                  value={regu}
                  onChange={(e) => setRegu(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button id="btn-submit-registration" type="submit" disabled={submitting} className="w-full scout-btn-primary py-3.5 text-sm">
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Simpan Profil'
              )}
            </button>
            <button
              id="btn-cancel-logout"
              type="button"
              onClick={logout}
              disabled={submitting}
              className="w-full scout-btn-secondary py-3 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Batal & Keluar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
