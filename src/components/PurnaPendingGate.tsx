/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Clock, XCircle, LogOut, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';
import type { AuthGateStatus } from '../lib/authGate';

interface PurnaPendingGateProps {
  status: Extract<AuthGateStatus, 'purna_pending' | 'purna_rejected' | 'approved_awaiting_login'>;
}

export function PurnaPendingGate({ status }: PurnaPendingGateProps) {
  const { logout, currentUser, retryProfileSetup, authError, clearAuthError } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const isPending = status === 'purna_pending';
  const isApproved = status === 'approved_awaiting_login';

  const iconBg = isApproved ? 'bg-lime-50' : isPending ? 'bg-amber-50' : 'bg-rose-50';
  const Icon = isApproved ? CheckCircle2 : isPending ? Clock : XCircle;
  const iconColor = isApproved ? 'text-lime-600' : isPending ? 'text-amber-600' : 'text-rose-600';

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    clearAuthError();
    try {
      await retryProfileSetup();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Gagal memperbarui status.');
    } finally {
      setRetrying(false);
    }
  };

  const displayError = retryError || authError;

  return (
    <div className="min-h-screen bg-bento-bg flex flex-col justify-center py-10 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md w-full mx-auto scout-card p-6 sm:p-8 text-center space-y-6">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${iconBg}`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>

        <Alert
          variant={isApproved ? 'success' : isPending ? 'warning' : 'error'}
          title={
            isApproved
              ? 'Akun disetujui'
              : isPending
                ? 'Akun Anda masih menunggu validasi.'
                : 'Pendaftaran ditolak'
          }
          message={
            isApproved
              ? 'Tekan "Perbarui Status" setelah Pembina menyiapkan aktivasi akun Anda.'
              : isPending
                ? 'Tunggu beberapa menit, Pembina akan memvalidasi pendaftaran Anda.'
                : `Pendaftaran untuk ${currentUser?.email} tidak disetujui. Hubungi Pembina untuk informasi lebih lanjut.`
          }
          className="text-left"
        />

        {displayError && (
          <Alert
            variant="error"
            title="Gagal mengaktifkan akun"
            message={displayError}
            className="text-left"
            onDismiss={() => {
              setRetryError(null);
              clearAuthError();
            }}
          />
        )}

        <div className="space-y-3">
        {(isPending || isApproved) && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="w-full scout-btn-google py-3.5 text-sm"
          >
            {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Perbarui Status
          </button>
        )}

        <button type="button" onClick={logout} className="w-full scout-btn-secondary py-3.5 text-sm">
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
        </div>
      </div>
    </div>
  );
}
