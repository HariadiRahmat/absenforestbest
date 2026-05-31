/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Clock, XCircle, LogOut, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';
import type { AuthGateStatus } from '../lib/authGate';

interface PurnaPendingGateProps {
  status: Extract<AuthGateStatus, 'purna_pending' | 'purna_rejected' | 'approved_awaiting_login'>;
}

export function PurnaPendingGate({ status }: PurnaPendingGateProps) {
  const { logout, currentUser, retryProfileSetup, authError, clearAuthError } = useAuth();
  const [activating, setActivating] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const isPending = status === 'purna_pending';
  const isApproved = status === 'approved_awaiting_login';

  const iconBg = isApproved ? 'bg-lime-50' : isPending ? 'bg-amber-50' : 'bg-rose-50';
  const Icon = isApproved ? CheckCircle2 : isPending ? Clock : XCircle;
  const iconColor = isApproved ? 'text-lime-600' : isPending ? 'text-amber-600' : 'text-rose-600';

  useEffect(() => {
    if (!isPending && !isApproved) return;

    let cancelled = false;

    const runActivation = async () => {
      setActivating(true);
      try {
        await retryProfileSetup({ silent: true });
      } catch (err) {
        if (!cancelled) {
          setRetryError(err instanceof Error ? err.message : 'Gagal mengaktifkan akun.');
        }
      } finally {
        if (!cancelled) setActivating(false);
      }
    };

    void runActivation();
    const interval = window.setInterval(runActivation, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isPending, isApproved, retryProfileSetup]);

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
              ? 'Akun sedang diaktifkan otomatis. Anda akan masuk ke aplikasi sebentar lagi.'
              : isPending
                ? 'Tunggu Pembina memvalidasi. Setelah disetujui, Anda akan masuk otomatis.'
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

        {(isPending || isApproved) && (
          <div className="flex items-center justify-center gap-2 text-sm text-bento-muted py-1">
            <Loader2 className={`w-4 h-4 ${activating ? 'animate-spin' : ''}`} />
            {isApproved ? 'Mengaktifkan akun...' : 'Menunggu validasi Pembina...'}
          </div>
        )}

        <button type="button" onClick={logout} className="w-full scout-btn-secondary py-3.5 text-sm">
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}
