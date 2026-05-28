/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, MapPin, Keyboard, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (token: string, location: { lat: number | null; lng: number | null }) => Promise<void>;
  loading: boolean;
  errorMsg: string | null;
}

export function QRScanner({ onScanSuccess, loading, errorMsg }: QRScannerProps) {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [useManualInput, setUseManualInput] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'success' | 'denied'>('idle');

  const qrCodeScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "reader-element-canvas";

  // Request GPS Coords smoothly
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGpsStatus('fetching');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGpsStatus('success');
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setGpsStatus('denied');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsStatus('denied');
    }
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (qrCodeScannerRef.current && qrCodeScannerRef.current.isScanning) {
        qrCodeScannerRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
      }
    };
  }, []);

  const startCameraScan = async () => {
    setUseManualInput(false);
    setIsScanning(true);
    setScanResult(null);

    // Short timeout to let the container render
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(scannerId);
        qrCodeScannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          async (decodedText) => {
            setScanResult(decodedText);
            // Auto stop camera
            if (scanner.isScanning) {
              await scanner.stop();
              setIsScanning(false);
            }
            await onScanSuccess(decodedText, gpsCoords);
          },
          (errorMessage) => {
            // normal scanning feedback, quiet
          }
        );
        setCameraPermission(true);
      } catch (err) {
        console.error("Camera scanner start failed:", err);
        setCameraPermission(false);
        setIsScanning(false);
        setUseManualInput(true); // Auto fallback to manual input if iframe or camera blocks
      }
    }, 150);
  };

  const stopCameraScan = async () => {
    if (qrCodeScannerRef.current && qrCodeScannerRef.current.isScanning) {
      try {
        await qrCodeScannerRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scan", err);
      }
    }
    setIsScanning(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await onScanSuccess(manualToken.trim(), gpsCoords);
  };

  return (
    <div id="scout-scanner-container" className="flex flex-col items-center max-w-md mx-auto p-4 bg-white rounded-3xl border border-emerald-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
        <span className="text-sm font-semibold tracking-wider uppercase text-emerald-800 font-sans">
          Absensi Pramuka QR
        </span>
      </div>

      {/* Geolocation Status Bar */}
      <div className="w-full flex items-center justify-between text-xs px-3 py-2 bg-emerald-50 rounded-xl mb-4 border border-emerald-100">
        <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
          <MapPin className="w-4 h-4 text-emerald-700" />
          <span>Status GPS:</span>
        </div>
        <div>
          {gpsStatus === 'fetching' && <span className="text-amber-700 font-medium animate-pulse">Satelit mencari...</span>}
          {gpsStatus === 'success' && (
            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
              Terkunci ({gpsCoords.lat?.toFixed(4)}, {gpsCoords.lng?.toFixed(4)})
            </span>
          )}
          {gpsStatus === 'denied' && <span className="text-rose-700 font-medium font-mono">Bypass Offline / Denied</span>}
          {gpsStatus === 'idle' && <span className="text-slate-500">Mempersiapkan...</span>}
        </div>
      </div>

      {errorMsg && (
        <div className="w-full mb-4 p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs flex gap-2 items-start animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Gagal Absen:</span> {errorMsg}
          </div>
        </div>
      )}

      {/* Mode Switches */}
      {!isScanning && !useManualInput && (
        <div className="py-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
            <Camera className="w-10 h-10 text-emerald-700" />
          </div>
          <h3 className="font-sans text-lg font-bold text-slate-800">Scan QR Code Absen</h3>
          <p className="font-sans text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Nyalakan kamera hpmu untuk menyorot QR code dinamis yang dipasang oleh Pembina Pramuka di papan dashboard.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full px-6">
            <button
              id="btn-start-camera"
              onClick={startCameraScan}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl shadow-sm transition-all text-sm font-semibold active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Buka Kamera Scan
            </button>
            <button
              id="btn-switch-manual"
              onClick={() => { setUseManualInput(true); setIsScanning(false); }}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl transition-all text-sm font-bold active:scale-95 cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
              Ketik Kode Manual
            </button>
          </div>
        </div>
      )}

      {/* Actively scanning view */}
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
              onClick={() => { stopCameraScan(); setUseManualInput(true); }}
              className="px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100"
            >
              Ganti ke Manual
            </button>
          </div>
        </div>
      )}

      {/* Manual text input view (Fallback) */}
      {useManualInput && (
        <form onSubmit={handleManualSubmit} className="w-full p-2 flex flex-col">
          <div className="w-12 h-12 bg-amber-50 text-amber-900 rounded-full flex items-center justify-center mb-3">
            <Keyboard className="w-6 h-6 text-amber-700" />
          </div>
          <h3 className="font-sans text-base font-bold text-slate-800">Metode Validasi Kode Manual</h3>
          <p className="font-sans text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
            Jika kamera tidak dapat terbuka (misal akibat batasan izin browser/iframe), ketik kode token harian yang tertera di layar Pembina di bawah ini.
          </p>

          <input
            id="input-manual-token"
            type="text"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center font-mono tracking-wider font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent bg-slate-50 mb-3"
            placeholder="Ketik Token (Contoh: SBT_xxxxx)"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            disabled={loading}
            required
          />

          <div className="flex gap-2 w-full mt-2">
            <button
              id="btn-cancel-manual"
              type="button"
              onClick={() => { setUseManualInput(false); }}
              disabled={loading}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Kembali
            </button>
            <button
              id="btn-submit-manual-token"
              type="submit"
              disabled={loading || !manualToken.trim()}
              className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
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

      {cameraPermission === false && (
        <div className="mt-4 p-2 text-center text-[11px] text-slate-500 font-sans border-t border-slate-100 w-full">
          💡 Kamera Anda terblokir atau iframe AI Studio melarang media. Silakan gunakan tombol <span className="font-bold underline text-emerald-800">Ketik Kode Manual</span> untuk tetap melakukan absensi dengan lancar!
        </div>
      )}
    </div>
  );
}
