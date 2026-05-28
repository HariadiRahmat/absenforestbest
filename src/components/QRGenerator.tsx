/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, RefreshCw, Copy, Check, Calendar, ShieldCheck, HelpCircle } from 'lucide-react';

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
      QRCode.toDataURL(token, {
        width: 320,
        margin: 2,
        color: {
          dark: '#064e3b', // Elegant deep forest green
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H'
      })
      .then(url => {
        setQrUrl(url);
      })
      .catch(err => {
        console.error("Failed to generate QR Code image:", err);
      });
    } else {
      setQrUrl('');
    }
  }, [token]);

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
    <div id="scout-qr-generator-card" className="bg-white rounded-[32px] border border-bento-border p-6 flex flex-col items-center shadow-sm">
      {/* Header Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-bento-soft text-bento-primary rounded-full text-xs font-bold mb-4 border border-bento-border-green/25">
        <ShieldCheck className="w-4 h-4 text-bento-primary" />
        <span>QR CODE REKAP HARIAN AKTIF</span>
      </div>

      <div className="w-full text-center max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-bento-primary" />
          <span className="text-sm font-semibold text-bento-text font-sans">Hari ini: {dateStr}</span>
        </div>
        <p className="text-xs text-bento-muted leading-relaxed mb-6 font-sans">
          Anggota memindai QR ini melalui smartphone mereka. QR ini berganti dan hangus otomatis setiap pukul 00:00 WIB.
        </p>
      </div>

      {/* QR Code Canvas Node */}
      <div className="relative p-4 bg-bento-soft/50 border border-bento-border rounded-[24px] mb-6 shadow-sm flex items-center justify-center w-[250px] h-[250px]">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 text-bento-primary animate-spin" />
            <span className="text-xs text-bento-muted font-sans">Menyiapkan QR...</span>
          </div>
        ) : qrUrl ? (
          <>
            <img src={qrUrl} alt="QR Code Absen" className="w-[220px] h-[220px] object-contain rounded-xl select-none" />
            {!isActive && (
              <div className="absolute inset-0 bg-slate-900/85 rounded-3xl flex flex-col items-center justify-center text-center p-4">
                <span className="text-rose-400 font-bold font-sans text-sm tracking-wide">QR EXPIRED</span>
                <span className="text-white text-xs mt-1 leading-normal px-2">Silakan klik Generate Baru di bawah untuk mengaktifkan absen hari ini.</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center flex flex-col items-center text-bento-muted gap-2">
            <QrCode className="w-12 h-12 stroke-1" />
            <span className="text-xs font-sans">No QR Active for {dateStr}</span>
          </div>
        )}
      </div>

      {/* Token details and helper utilities */}
      {token && (
        <div className="w-full bg-bento-soft/70 border border-bento-border rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="text-left">
              <span className="text-[10px] text-bento-muted font-bold uppercase tracking-wider font-mono">Token Harian</span>
              <div className="font-mono text-bento-text font-extrabold text-sm tracking-widest">{token}</div>
            </div>
            <div className="flex gap-2">
              <button
                id="btn-copy-token"
                onClick={handleCopyToken}
                className="p-2 hover:bg-bento-border-green/25 hover:text-bento-primary text-bento-text transition rounded-xl bg-white border border-bento-border"
                title="Salin Token"
              >
                {copied ? <Check className="w-4 h-4 text-bento-primary" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                id="btn-download-qr"
                onClick={handleDownloadQR}
                disabled={!qrUrl}
                className="p-2 hover:bg-bento-border-green/25 hover:text-bento-primary text-bento-text transition rounded-xl bg-white border border-bento-border disabled:opacity-50"
                title="Unduh QR Code"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Action Button to manually regenerate */}
      <button
        id="btn-rotate-token"
        onClick={onRotateToken}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-bento-primary hover:bg-bento-primary-hover active:scale-98 transition text-white font-bold rounded-2xl text-sm shadow-sm cursor-pointer border border-bento-primary"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {token ? 'Regenerate QR Harian (Reset)' : 'Generate Absen Hari Ini'}
      </button>
    </div>
  );
}
