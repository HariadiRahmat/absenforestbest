/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, XCircle, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';
import type { AuthGateStatus } from '../lib/authGate';

interface PurnaPendingGateProps {
  status: Extract<AuthGateStatus, 'purna_pending' | 'purna_rejected' | 'approved_awaiting_login'>;
}

export function PurnaPendingGate({ status }: PurnaPendingGateProps) {
  const { logout, currentUser } = useAuth();
  const isPending = status === 'purna_pending';
  const isApproved = status === 'approved_awaiting_login';

  const iconBg = isApproved ? 'bg-lime-50' : isPending ? 'bg-amber-50' : 'bg-rose-50';
  const Icon = isApproved ? CheckCircle2 : isPending ? Clock : XCircle;
  const iconColor = isApproved ? 'text-lime-600' : isPending ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="min-h-screen bg-bento-bg flex flex-col justify-center py-8 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md w-full mx-auto scout-card p-6 sm:p-8 text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${iconBg}`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>

        <Alert
          variant={isApproved ? 'success' : isPending ? 'warning' : 'error'}
          title={
            isApproved
              ? 'Akun Disetujui'
              : isPending
                ? 'Menunggu Konfirmasi Admin'
                : 'Pendaftaran Ditolak'
          }
          message={
            isApproved
              ? `Pendaftaran ${currentUser?.email} sudah disetujui. Keluar lalu login kembali dengan Google untuk mengaktifkan akun.`
              : isPending
                ? `Pendaftaran untuk ${currentUser?.email} sedang ditinjau Pembina. Login kembali setelah disetujui.`
                : `Pendaftaran untuk ${currentUser?.email} tidak disetujui. Hubungi Pembina untuk informasi lebih lanjut.`
          }
          tips={
            isApproved
              ? ['Keluar dari akun ini, lalu tekan Masuk dengan Google lagi.', 'Jika masalah berlanjut, hubungi Pembina.']
              : isPending
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
