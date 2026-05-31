/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildQrContent } from '../lib/qrPayload';
import { QrCode, Download, RefreshCw, Copy, Check, Calendar, ShieldCheck } from 'lucide-react';

interface QRGeneratorProps {
  token: string | null;
  dateStr: string;
  onRotateToken: () => Promise<void>;
  loading: boolean;
  isActive: boolean;
}

export function QRGenerator({ token, dateStr, onRotateToken, loading, isActive }: QRGeneratorProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) {
      const qrContent = buildQrContent(token, dateStr);
      QRCode.toDataURL(qrContent, {
        width: 320,
        margin: 2,
        color: { dark: '#111827', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Failed to generate QR Code image:', err));
    } else {
      setQrUrl('');
    }
  }, [token, dateStr]);

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `QR_Absensi_Pramuka_${dateStr}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="scout-qr-generator-card" className="scout-card p-4 sm:p-6 flex flex-col items-center w-full">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bento-accent text-bento-dark rounded-full text-xs font-semibold mb-5">
        <ShieldCheck className="w-4 h-4" />
        QR Harian Aktif
      </div>

      <div className="w-full text-center max-w-sm mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-bento-primary" />
          <span className="text-sm font-semibold text-bento-text">{dateStr}</span>
        </div>
        <p className="text-xs text-bento-muted leading-relaxed">
          QR berganti otomatis setiap pukul 00:00 WIB.
        </p>
      </div>

      <div className="relative p-4 bg-bento-soft border border-bento-border rounded-[24px] mb-6 flex items-center justify-center w-[250px] h-[250px]">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 text-bento-primary animate-spin" />
            <span className="text-xs text-bento-muted">Menyiapkan QR...</span>
          </div>
        ) : qrUrl ? (
          <>
            <img src={qrUrl} alt="QR Code Absen" className="w-[220px] h-[220px] object-contain rounded-xl select-none" />
            {!isActive && (
              <div className="absolute inset-0 bg-bento-dark/85 rounded-3xl flex flex-col items-center justify-center text-center p-4">
                <span className="text-rose-300 font-semibold text-sm">QR Expired</span>
                <span className="text-white/80 text-xs mt-1">Generate QR baru untuk mengaktifkan absen.</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center flex flex-col items-center text-bento-muted gap-2">
            <QrCode className="w-12 h-12 stroke-1" />
            <span className="text-xs">Belum ada QR untuk {dateStr}</span>
          </div>
        )}
      </div>

      {token && (
        <div className="w-full bg-bento-soft border border-bento-border rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="text-left">
              <span className="text-[10px] text-bento-muted font-semibold uppercase tracking-wider">Token Harian</span>
              <div className="font-mono text-bento-text font-bold text-sm tracking-widest mt-0.5">{token}</div>
            </div>
            <div className="flex gap-2">
              <button
                id="btn-copy-token"
                onClick={handleCopyToken}
                className="p-2 hover:bg-white text-bento-text transition rounded-xl bg-white border border-bento-border"
                title="Salin Token"
              >
                {copied ? <Check className="w-4 h-4 text-bento-primary" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                id="btn-download-qr"
                onClick={handleDownloadQR}
                disabled={!qrUrl}
                className="p-2 hover:bg-white text-bento-text transition rounded-xl bg-white border border-bento-border disabled:opacity-50"
                title="Unduh QR Code"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        id="btn-rotate-token"
        onClick={onRotateToken}
        disabled={loading}
        className="w-full scout-btn-primary py-3.5 text-sm"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {token ? 'Regenerate QR Harian' : 'Generate Absen Hari Ini'}
      </button>
    </div>
  );
}
