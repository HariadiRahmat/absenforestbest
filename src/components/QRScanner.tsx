/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, MapPin, Keyboard, ShieldCheck, QrCode } from 'lucide-react';
import { parseQrScan, validateQrForToday } from '../lib/qrPayload';
import { getTodayStr } from '../lib/dateUtils';
import { parseAttendanceError } from '../lib/attendanceErrors';
import { getGeofenceConfig, isWithinGeofence, geofenceMapsUrl } from '../lib/geofence';
import { GeofenceConfig } from '../types';
import { Alert, type FriendlyError } from './ui/Alert';

export interface AttendancePayload {
  userId: string;
  nama: string;
  tanggal: string;
  qrToken: string;
  status: 'hadir';
  latitude: number | null;
  longitude: number | null;
  timestamp: Date;
}

interface QRScannerProps {
  onScanSuccess: (payload: AttendancePayload) => Promise<void>;
  userId: string;
  memberName: string;
  loading: boolean;
  error: FriendlyError | null;
}

function validateToken(token: string): FriendlyError | null {
  const t = token.trim();
  if (!t) {
    return { title: 'Token kosong', message: 'Masukkan atau scan kode QR dari Pembina.' };
  }
  if (t.length > 100) {
    return {
      title: 'Token terlalu panjang',
      message: `Maksimal 100 karakter. Token Anda ${t.length} karakter.`,
    };
  }
  return null;
}

export function QRScanner({
  onScanSuccess,
  userId,
  memberName,
  loading,
  error,
}: QRScannerProps) {
  const [manualToken, setManualToken] = useState('');
  const [localError, setLocalError] = useState<FriendlyError | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [useManualInput, setUseManualInput] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'success' | 'denied'>('idle');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [geofence, setGeofence] = useState<GeofenceConfig | null>(null);

  const qrCodeScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'reader-element-canvas';

  useEffect(() => {
    getGeofenceConfig().then(setGeofence).catch(console.warn);
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      setGpsStatus('fetching');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('success');
        },
        () => {
          setGpsCoords({ lat: null, lng: null });
          setGpsStatus('denied');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsCoords({ lat: null, lng: null });
      setGpsStatus('denied');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (qrCodeScannerRef.current?.isScanning) {
        qrCodeScannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  function buildPayload(raw: string): AttendancePayload {
    const parsed = parseQrScan(raw);
    const dateError = validateQrForToday(parsed);
    if (dateError) throw new Error(dateError);

    return {
      userId,
      nama: (memberName ?? '').slice(0, 100),
      tanggal: parsed.date,
      qrToken: parsed.token.slice(0, 100),
      status: 'hadir',
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lng,
      timestamp: new Date(),
    };
  }

  async function submitPayload(rawToken: string) {
    setLocalError(null);
    const validErr = validateToken(rawToken);
    if (validErr) {
      setLocalError(validErr);
      return;
    }
    let payload: AttendancePayload;
    try {
      payload = buildPayload(rawToken);
    } catch (err) {
      setLocalError(parseAttendanceError(err));
      return;
    }
    try {
      await onScanSuccess(payload);
      setScanSuccess(true);
    } catch (err) {
      setScanSuccess(false);
      setLocalError(parseAttendanceError(err));
    }
  }

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
          () => {}
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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPayload(manualToken);
  };

  const displayError = localError ?? error;
  const withinGeofence = geofence ? isWithinGeofence(geofence, gpsCoords.lat, gpsCoords.lng) : null;

  return (
    <div id="scout-scanner-container" className="scout-card p-4 sm:p-6 w-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-bento-accent flex items-center justify-center">
          <QrCode className="w-5 h-5 text-bento-dark" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-bento-muted">
            Check-in Harian
          </p>
          <h3 className="text-base font-bold text-bento-text">Scan QR Absensi</h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bento-soft rounded-full text-xs text-bento-muted border border-bento-border">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{getTodayStr()}</span>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${
            gpsStatus === 'success' && withinGeofence === true
              ? 'bg-lime-50 text-lime-800 border-lime-200'
              : gpsStatus === 'success' && withinGeofence === false
                ? 'bg-rose-50 text-rose-800 border-rose-100'
                : gpsStatus === 'success'
                  ? 'bg-lime-50 text-lime-800 border-lime-200'
                  : gpsStatus === 'denied'
                    ? 'bg-amber-50 text-amber-800 border-amber-100'
                    : 'bg-bento-soft text-bento-muted border-bento-border'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          {gpsStatus === 'fetching' && 'Mencari GPS...'}
          {gpsStatus === 'success' && withinGeofence === false && geofence?.enabled && 'Di luar area latihan'}
          {gpsStatus === 'success' && withinGeofence === true && geofence?.enabled && 'Dalam area latihan'}
          {gpsStatus === 'success' && withinGeofence === null && `GPS (${gpsCoords.lat?.toFixed(4)}, ${gpsCoords.lng?.toFixed(4)})`}
          {gpsStatus === 'denied' && 'GPS tidak aktif'}
          {gpsStatus === 'idle' && 'Menyiapkan GPS...'}
        </div>
      </div>

      {geofence?.enabled && (
        <div className="mb-4 space-y-2">
          <Alert
            variant="info"
            title={`Area latihan: ${geofence.label}`}
            message={`Absensi hanya bisa dilakukan dalam radius ${geofence.radiusMeters} m dari lokasi latihan.`}
          />
          <a
            href={geofenceMapsUrl(geofence)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-xs font-semibold text-bento-primary hover:underline"
          >
            Lihat lokasi latihan di Google Maps →
          </a>
        </div>
      )}

      {displayError && (
        <Alert
          variant="error"
          title={displayError.title}
          message={displayError.message}
          tips={displayError.tips}
          onDismiss={() => setLocalError(null)}
          className="mb-4"
        />
      )}

      {scanSuccess && !displayError && (
        <Alert
          variant="success"
          title="Absensi berhasil!"
          message="Kehadiran Anda hari ini sudah tercatat. Terima kasih."
          className="mb-4"
        />
      )}

      {!isScanning && !useManualInput && (
        <div className="py-6 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-bento-highlight rounded-[24px] flex items-center justify-center mb-5">
            <Camera className="w-9 h-9 text-bento-primary" />
          </div>
          <h3 className="text-lg font-bold text-bento-text">Pindai QR Code Pembina</h3>
          <p className="text-sm text-bento-muted mt-2 max-w-xs leading-relaxed">
            Arahkan kamera ke QR yang ditampilkan Pembina di dashboard hari ini.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
            <button
              id="btn-start-camera"
              onClick={startCameraScan}
              disabled={loading}
              className="scout-btn-primary flex-1 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Buka Kamera
            </button>
            <button
              id="btn-switch-manual"
              onClick={() => {
                setUseManualInput(true);
                setIsScanning(false);
              }}
              disabled={loading}
              className="scout-btn-secondary flex-1"
            >
              <Keyboard className="w-4 h-4" />
              Input Manual
            </button>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="w-full text-center flex flex-col items-center">
          <div className="w-full aspect-square max-w-[280px] bg-bento-dark rounded-[24px] relative overflow-hidden mb-4">
            <div id={scannerId} className="w-full h-full [&>video]:object-cover" />
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-bento-accent animate-pulse" />
          </div>
          <p className="text-sm text-bento-muted">Arahkan kamera ke QR Code...</p>
          <div className="mt-4 flex gap-2">
            <button id="btn-stop-camera" onClick={stopCameraScan} className="scout-btn-secondary text-xs py-2 px-4">
              Kembali
            </button>
            <button
              id="btn-switch-manual-active"
              onClick={() => {
                stopCameraScan();
                setUseManualInput(true);
              }}
              className="scout-btn-secondary text-xs py-2 px-4"
            >
              Input Manual
            </button>
          </div>
        </div>
      )}

      {useManualInput && (
        <form onSubmit={handleManualSubmit} className="w-full flex flex-col">
          <div className="w-12 h-12 bg-bento-highlight rounded-2xl flex items-center justify-center mb-3">
            <Keyboard className="w-6 h-6 text-bento-primary" />
          </div>
          <h3 className="text-base font-bold text-bento-text">Token Manual</h3>
          <p className="text-sm text-bento-muted mt-1 mb-4 leading-relaxed">
            Ketik token harian persis seperti yang tertera di layar Pembina.
          </p>

          <input
            id="input-manual-token"
            type="text"
            className="w-full px-4 py-3.5 border border-bento-border rounded-2xl text-center font-mono tracking-wider font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary bg-bento-soft mb-1"
            placeholder="SBT_XXXXXXXX_XXXX"
            value={manualToken}
            onChange={(e) => {
              setLocalError(null);
              if (e.target.value.length <= 100) setManualToken(e.target.value);
            }}
            disabled={loading}
            maxLength={100}
            required
          />
          <p className="text-right text-[11px] text-bento-muted mb-4 font-mono">{manualToken.length}/100</p>

          <div className="flex gap-2 w-full">
            <button
              id="btn-cancel-manual"
              type="button"
              onClick={() => {
                setUseManualInput(false);
                setLocalError(null);
              }}
              disabled={loading}
              className="scout-btn-secondary flex-1 text-sm py-3"
            >
              Kembali
            </button>
            <button
              id="btn-submit-manual-token"
              type="submit"
              disabled={loading || !manualToken.trim()}
              className="scout-btn-primary flex-1 text-sm py-3 disabled:opacity-50"
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
        <Alert
          variant="info"
          title="Kamera tidak tersedia"
          message="Browser memblokir akses kamera. Anda tetap bisa absen dengan input token manual."
          className="mt-4"
        />
      )}
    </div>
  );
}
