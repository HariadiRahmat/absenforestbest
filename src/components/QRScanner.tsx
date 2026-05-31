/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QRScanner — disesuaikan dengan Firestore Security Rules:
 *
 * attendance.create mensyaratkan:
 *   - userId        == request.auth.uid
 *   - nama          : string, max 100
 *   - tanggal       : string, panjang tepat 10 (format YYYY-MM-DD)
 *   - qrToken       : string, max 100
 *   - status        == 'hadir'
 *   - latitude      : null | number
 *   - longitude     : null | number
 *   - timestamp     : Firestore Timestamp (server atau client Timestamp)
 *   - qr_codes/{tanggal}.token == qrToken  &&  .active == true
 *
 * Perubahan utama dari versi sebelumnya:
 *   1. onScanSuccess sekarang menerima AttendancePayload (bukan string mentah)
 *      supaya pemanggil (parent) bisa langsung write ke Firestore tanpa
 *      transformasi tambahan — semua field sudah sesuai rules.
 *   2. Tanggal (YYYY-MM-DD) di-generate di sisi klien dan dikirim bersama token.
 *   3. Field `status` selalu di-set 'hadir' di payload.
 *   4. GPS lat/lng dikirim sebagai number | null (bukan undefined).
 *   5. Validasi panjang token ≤ 100 char sebelum submit.
 *   6. Nama anggota diambil via prop `memberName` agar parent bisa isi dari
 *      profil Firebase Auth / Firestore user doc.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  MapPin,
  Keyboard,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Payload yang sudah siap ditulis ke Firestore.
 * Semua field sesuai dengan rules attendance.create.
 *
 * Catatan: `timestamp` sengaja dibiarkan sebagai Date agar parent bisa
 * mengkonversi ke Firestore.Timestamp.fromDate(timestamp) atau
 * menggunakan serverTimestamp() sesuai kebutuhan.
 */
export interface AttendancePayload {
  /** Diisi parent dari Firebase Auth currentUser.uid */
  userId: string;
  /** Diisi parent dari profil Firestore user (max 100 char) */
  nama: string;
  /** Format YYYY-MM-DD, tepat 10 karakter — divalidasi sesuai rules */
  tanggal: string;
  /** Token dari QR code atau input manual (max 100 char) */
  qrToken: string;
  /** Selalu 'hadir' — sesuai rules */
  status: 'hadir';
  /** null jika GPS tidak tersedia */
  latitude: number | null;
  /** null jika GPS tidak tersedia */
  longitude: number | null;
  /** Waktu scan; parent mengkonversi ke Firestore Timestamp */
  timestamp: Date;
}

interface QRScannerProps {
  /**
   * Callback dipanggil setelah token berhasil di-scan/diketik dan lolos
   * validasi awal (panjang, format). Parent bertanggung jawab menulis
   * payload ke Firestore dan mengembalikan error jika gagal.
   */
  onScanSuccess: (payload: AttendancePayload) => Promise<void>;
  /** UID Firebase Auth dari anggota yang login */
  userId: string;
  /** Nama lengkap anggota dari profil Firestore (max 100 char) */
  memberName: string;
  loading: boolean;
  errorMsg: string | null;
}

// ---------------------------------------------------------------------------
// Helper: tanggal lokal YYYY-MM-DD (10 char persis)
// ---------------------------------------------------------------------------
function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // Tepat 10 karakter → lolos rules tanggal.size() == 10
}

// ---------------------------------------------------------------------------
// Validasi token sebelum submit (sesuai rules qrToken max 100 char)
// ---------------------------------------------------------------------------
function validateToken(token: string): string | null {
  const t = token.trim();
  if (!t) return 'Token tidak boleh kosong.';
  if (t.length > 100) return `Token terlalu panjang (maks 100 karakter, sekarang ${t.length}).`;
  return null; // valid
}

// ---------------------------------------------------------------------------
// Komponen
// ---------------------------------------------------------------------------
export function QRScanner({
  onScanSuccess,
  userId,
  memberName,
  loading,
  errorMsg,
}: QRScannerProps) {
  const [manualToken, setManualToken] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [useManualInput, setUseManualInput] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'success' | 'denied'>('idle');
  const [scanSuccess, setScanSuccess] = useState(false);

  const qrCodeScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'reader-element-canvas';

  // -------------------------------------------------------------------------
  // GPS — lat/lng dikirim sebagai number | null (bukan undefined)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGpsStatus('fetching');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('success');
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setGpsCoords({ lat: null, lng: null }); // explicit null → lolos rules (null | number)
          setGpsStatus('denied');
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      setGpsCoords({ lat: null, lng: null });
      setGpsStatus('denied');
    }
  }, []);

  // Cleanup scanner
  useEffect(() => {
    return () => {
      if (qrCodeScannerRef.current?.isScanning) {
        qrCodeScannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Build payload — semua field sesuai rules
  // -------------------------------------------------------------------------
  function buildPayload(token: string): AttendancePayload {
    const safeName = (memberName ?? '').slice(0, 100); // guard jika prop undefined/null
    return {
      userId,
      nama: safeName,                  // max 100 char
      tanggal: getTodayString(),       // YYYY-MM-DD, tepat 10 char
      qrToken: token.trim().slice(0, 100), // max 100 char
      status: 'hadir',                 // rules mewajibkan nilai ini
      latitude: gpsCoords.lat,         // number | null
      longitude: gpsCoords.lng,        // number | null
      timestamp: new Date(),           // parent konversi ke Firestore Timestamp
    };
  }

  // -------------------------------------------------------------------------
  // Trigger submit (shared antara scan & manual)
  // -------------------------------------------------------------------------
  async function submitPayload(rawToken: string) {
    setLocalError(null);
    const validErr = validateToken(rawToken);
    if (validErr) {
      setLocalError(validErr);
      return;
    }
    const payload = buildPayload(rawToken);
    try {
      await onScanSuccess(payload);
      setScanSuccess(true);
    } catch {
      setScanSuccess(false);
    }
  }

  // -------------------------------------------------------------------------
  // Kamera
  // -------------------------------------------------------------------------
  const startCameraScan = async () => {
    setUseManualInput(false);
    setIsScanning(true);
    setScanSuccess(false);
    setLocalError(null);

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(scannerId);
        qrCodeScannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (w, h) => {
              const size = Math.min(w, h) * 0.7;
              return { width: size, height: size };
            },
          },
          async (decodedText) => {
            if (scanner.isScanning) {
              await scanner.stop();
              setIsScanning(false);
            }
            await submitPayload(decodedText);
          },
          () => {
            /* scanning feedback — quiet */
          },
        );
        setCameraPermission(true);
      } catch (err) {
        console.error('Camera scanner start failed:', err);
        setCameraPermission(false);
        setIsScanning(false);
        setUseManualInput(true);
      }
    }, 150);
  };

  const stopCameraScan = async () => {
    if (qrCodeScannerRef.current?.isScanning) {
      try {
        await qrCodeScannerRef.current.stop();
      } catch (err) {
        console.error('Failed to stop scan', err);
      }
    }
    setIsScanning(false);
  };

  // -------------------------------------------------------------------------
  // Manual submit
  // -------------------------------------------------------------------------
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPayload(manualToken);
  };

  // Gabungkan error dari parent & error validasi lokal
  const displayError = localError ?? errorMsg;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      id="scout-scanner-container"
      className="flex flex-col items-center max-w-md mx-auto p-4 bg-white rounded-3xl border border-emerald-100 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
        <span className="text-sm font-semibold tracking-wider uppercase text-emerald-800 font-sans">
          Absensi Pramuka QR
        </span>
      </div>

      {/* GPS Status */}
      <div className="w-full flex items-center justify-between text-xs px-3 py-2 bg-emerald-50 rounded-xl mb-2 border border-emerald-100">
        <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
          <MapPin className="w-4 h-4 text-emerald-700" />
          <span>Status GPS:</span>
        </div>
        <div>
          {gpsStatus === 'fetching' && (
            <span className="text-amber-700 font-medium animate-pulse">Satelit mencari...</span>
          )}
          {gpsStatus === 'success' && (
            <span className="text-emerald-700 font-bold">
              Terkunci ({gpsCoords.lat?.toFixed(4)}, {gpsCoords.lng?.toFixed(4)})
            </span>
          )}
          {gpsStatus === 'denied' && (
            <span className="text-rose-700 font-medium font-mono">Lokasi tidak tersedia</span>
          )}
          {gpsStatus === 'idle' && <span className="text-slate-500">Mempersiapkan...</span>}
        </div>
      </div>

      {/* Info tanggal & context — bantu debug jika qr_codes/{tanggal} tidak ada */}
      <div className="w-full flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-50 rounded-xl mb-4 border border-slate-100 text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          Tanggal validasi:{' '}
          <span className="font-mono font-bold text-slate-700">{getTodayString()}</span>
          {' · '}Anggota: <span className="font-semibold text-slate-700">{memberName || '—'}</span>
        </span>
      </div>

      {/* Error */}
      {displayError && (
        <div className="w-full mb-4 p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Gagal Absen:</span> {displayError}
          </div>
        </div>
      )}

      {/* Sukses */}
      {scanSuccess && !displayError && (
        <div className="w-full mb-4 p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex gap-2 items-start">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Absen berhasil dicatat!</span>{' '}
            Kehadiran kamu hari ini sudah tersimpan.
          </div>
        </div>
      )}

      {/* ── Idle: pilih mode ── */}
      {!isScanning && !useManualInput && (
        <div className="py-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
            <Camera className="w-10 h-10 text-emerald-700" />
          </div>
          <h3 className="font-sans text-lg font-bold text-slate-800">Scan QR Code Absen</h3>
          <p className="font-sans text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Sorot kamera ke QR code dinamis yang dipasang Pembina di papan dashboard. Token QR
            diverifikasi langsung ke Firestore{' '}
            <span className="font-semibold text-emerald-700">qr_codes/{getTodayString()}</span>.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full px-6">
            <button
              id="btn-start-camera"
              onClick={startCameraScan}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl shadow-sm transition-all text-sm font-semibold active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Buka Kamera Scan
            </button>
            <button
              id="btn-switch-manual"
              onClick={() => {
                setUseManualInput(true);
                setIsScanning(false);
              }}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl transition-all text-sm font-bold active:scale-95 cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
              Ketik Kode Manual
            </button>
          </div>
        </div>
      )}

      {/* ── Scanning view ── */}
      {isScanning && (
        <div className="w-full text-center flex flex-col items-center">
          <div className="w-full aspect-square max-w-[280px] bg-slate-900 rounded-2xl relative overflow-hidden border-2 border-emerald-500 mb-4 shadow">
            <div id={scannerId} className="w-full h-full [&>video]:object-cover" />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 animate-pulse origin-center" />
          </div>
          <p className="text-xs text-slate-500 animate-pulse">Sorot kamera ke QR Code Pembina...</p>
          <div className="mt-4 flex gap-2">
            <button
              id="btn-stop-camera"
              onClick={stopCameraScan}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              Kembali
            </button>
            <button
              id="btn-switch-manual-active"
              onClick={() => {
                stopCameraScan();
                setUseManualInput(true);
              }}
              className="px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100"
            >
              Ganti ke Manual
            </button>
          </div>
        </div>
      )}

      {/* ── Manual input ── */}
      {useManualInput && (
        <form onSubmit={handleManualSubmit} className="w-full p-2 flex flex-col">
          <div className="w-12 h-12 bg-amber-50 text-amber-900 rounded-full flex items-center justify-center mb-3">
            <Keyboard className="w-6 h-6 text-amber-700" />
          </div>
          <h3 className="font-sans text-base font-bold text-slate-800">Input Kode Token Manual</h3>
          <p className="font-sans text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
            Masukkan token harian yang tertera di layar Pembina. Token akan dicocokkan ke{' '}
            <span className="font-mono font-semibold text-emerald-700">
              qr_codes/{getTodayString()}
            </span>{' '}
            di Firestore (max 100 karakter).
          </p>

          <input
            id="input-manual-token"
            type="text"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center font-mono tracking-wider font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent bg-slate-50 mb-1"
            placeholder="Contoh: SBT_xxxxx"
            value={manualToken}
            onChange={(e) => {
              setLocalError(null);
              // Batasi input di UI agar tidak melebihi 100 char (rules)
              if (e.target.value.length <= 100) setManualToken(e.target.value);
            }}
            disabled={loading}
            maxLength={100}
            required
          />
          {/* Counter panjang token */}
          <p className="text-right text-[10px] text-slate-400 mb-3 font-mono">
            {manualToken.length}/100
          </p>

          <div className="flex gap-2 w-full">
            <button
              id="btn-cancel-manual"
              type="button"
              onClick={() => {
                setUseManualInput(false);
                setLocalError(null);
              }}
              disabled={loading}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Kembali
            </button>
            <button
              id="btn-submit-manual-token"
              type="submit"
              disabled={loading || !manualToken.trim()}
              className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Kirim Absen'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Pesan kamera blokir */}
      {cameraPermission === false && (
        <div className="mt-4 p-2 text-center text-[11px] text-slate-500 font-sans border-t border-slate-100 w-full">
          💡 Kamera terblokir atau iframe melarang akses media. Gunakan{' '}
          <span className="font-bold underline text-emerald-800">Ketik Kode Manual</span> untuk
          tetap melakukan absensi!
        </div>
      )}
    </div>
  );
}
