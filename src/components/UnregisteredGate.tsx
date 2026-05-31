/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';

export function UnregisteredGate() {
  const { logout, currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-bento-bg flex flex-col justify-center py-8 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md w-full mx-auto scout-card p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-bento-soft border border-bento-border flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-bento-primary" />
        </div>

        <h2 className="text-xl font-bold text-bento-text">Akun Belum Terdaftar</h2>
        <p className="text-sm text-bento-muted mt-2 leading-relaxed">
          Email <span className="font-mono text-bento-text">{currentUser?.email}</span> belum
          didaftarkan oleh Pembina.
        </p>

        <Alert
          variant="warning"
          title="Akses memerlukan validasi Pembina"
          message="Setiap pengguna harus didaftarkan terlebih dahulu. Pembina akan menetapkan role Anda sebagai Anggota, Pembina, atau Purna."
          tips={[
            'Anggota & Pembina: hubungi Pembina agar email Anda di pre-register.',
            'Purna: daftar lewat halaman Registrasi Purna, lalu tunggu konfirmasi admin.',
          ]}
          className="mb-6 mt-5 text-left"
        />

        <button onClick={logout} className="w-full scout-btn-secondary py-3 text-sm">
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}
