/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, XCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';
import type { AuthGateStatus } from '../lib/authGate';

interface PurnaPendingGateProps {
  status: Extract<AuthGateStatus, 'purna_pending' | 'purna_rejected'>;
}

export function PurnaPendingGate({ status }: PurnaPendingGateProps) {
  const { logout, currentUser } = useAuth();
  const isPending = status === 'purna_pending';

  return (
    <div className="min-h-screen bg-bento-bg flex flex-col justify-center py-8 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md w-full mx-auto scout-card p-6 sm:p-8 text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${isPending ? 'bg-amber-50' : 'bg-rose-50'}`}>
          {isPending ? (
            <Clock className="w-8 h-8 text-amber-600" />
          ) : (
            <XCircle className="w-8 h-8 text-rose-600" />
          )}
        </div>

        <Alert
          variant={isPending ? 'warning' : 'error'}
          title={isPending ? 'Menunggu Konfirmasi Admin' : 'Pendaftaran Ditolak'}
          message={
            isPending
              ? `Pendaftaran untuk ${currentUser?.email} sedang ditinjau Pembina. Login kembali setelah disetujui.`
              : `Pendaftaran untuk ${currentUser?.email} tidak disetujui. Hubungi Pembina untuk informasi lebih lanjut.`
          }
          tips={
            isPending
              ? ['Cek email secara berkala.', 'Login kembali setelah Pembina mengkonfirmasi akun Anda.']
              : ['Hubungi Pembina jika ada pertanyaan.']
          }
          className="mb-6 text-left"
        />

        <button onClick={logout} className="w-full scout-btn-secondary py-3 text-sm">
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}
