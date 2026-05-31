/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, Navigation, Save, Loader2, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react';
import { db, logFirestoreError } from '../lib/firebase';
import { DEFAULT_GEOFENCE, GeofenceConfig, OperationType } from '../types';
import { geofenceMapsUrl, normalizeGeofenceConfig } from '../lib/geofence';
import { Alert } from './ui/Alert';

export function GeofenceSettings() {
  const [config, setConfig] = useState<GeofenceConfig>({ ...DEFAULT_GEOFENCE });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, 'settings', 'geofence');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setConfig(normalizeGeofenceConfig(snap.data() as Record<string, unknown>));
        } else {
          setConfig({ ...DEFAULT_GEOFENCE });
        }
      },
      (err) => {
        logFirestoreError(err, OperationType.GET, 'settings/geofence');
        setError('Gagal memuat pengaturan GPS.');
      }
    );
    return () => unsub();
  }, []);

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Browser tidak mendukung geolocation.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setConfig((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setLocating(false);
      },
      () => {
        setError('Izin lokasi ditolak. Aktifkan GPS di pengaturan perangkat.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveOk(false);

    const lat = Number(config.latitude);
    const lng = Number(config.longitude);
    const radius = Number(config.radiusMeters);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude harus antara -90 dan 90.');
      setSaving(false);
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude harus antara -180 dan 180.');
      setSaving(false);
      return;
    }
    if (Number.isNaN(radius) || radius < 10 || radius > 5000) {
      setError('Radius harus antara 10 m dan 5000 m.');
      setSaving(false);
      return;
    }

    try {
      const payload: GeofenceConfig = {
        enabled: config.enabled,
        label: config.label.trim().slice(0, 80) || DEFAULT_GEOFENCE.label,
        latitude: lat,
        longitude: lng,
        radiusMeters: Math.round(radius),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'settings', 'geofence'), payload, { merge: true });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan pengaturan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scout-card p-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-bento-accent flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-bento-dark" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-bento-text">Pengaturan Lokasi Latihan</h3>
            <p className="text-sm text-bento-muted mt-0.5">
              Tentukan titik latihan dan jarak maksimum absensi dari lokasi tersebut.
            </p>
          </div>
        </div>
        <button
          type="button"
          id="btn-toggle-geofence"
          onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold border transition ${
            config.enabled
              ? 'bg-lime-50 text-lime-800 border-lime-200'
              : 'bg-bento-soft text-bento-muted border-bento-border'
          }`}
        >
          {config.enabled ? (
            <>
              <ToggleRight className="w-5 h-5" /> Aktif
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5" /> Nonaktif
            </>
          )}
        </button>
      </div>

      {config.enabled && (
        <Alert
          variant="info"
          title="Geofence aktif"
          message="Anggota wajib berada dalam radius yang ditentukan saat absen. GPS harus diizinkan."
          className="mb-5"
        />
      )}

      {error && (
        <Alert variant="error" title="Perhatian" message={error} className="mb-5" onDismiss={() => setError(null)} />
      )}

      {saveOk && (
        <Alert variant="success" title="Tersimpan" message="Pengaturan lokasi latihan berhasil disimpan." className="mb-5" />
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="space-y-1">
          <label htmlFor="geofence-label" className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">
            Nama Lokasi
          </label>
          <input
            id="geofence-label"
            type="text"
            className="w-full px-4 py-3 border border-bento-border rounded-2xl text-sm bg-bento-soft focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
            placeholder="Contoh: Pangkalan Pramuka SMA Forest"
            value={config.label}
            onChange={(e) => setConfig((prev) => ({ ...prev, label: e.target.value }))}
            maxLength={80}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="geofence-lat" className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">
              Latitude
            </label>
            <input
              id="geofence-lat"
              type="number"
              step="any"
              className="w-full px-4 py-3 border border-bento-border rounded-2xl text-sm font-mono bg-bento-soft focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
              value={config.latitude}
              onChange={(e) => setConfig((prev) => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="geofence-lng" className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">
              Longitude
            </label>
            <input
              id="geofence-lng"
              type="number"
              step="any"
              className="w-full px-4 py-3 border border-bento-border rounded-2xl text-sm font-mono bg-bento-soft focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
              value={config.longitude}
              onChange={(e) => setConfig((prev) => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="geofence-radius" className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">
              Radius Maksimum
            </label>
            <span className="text-sm font-bold text-bento-primary">{config.radiusMeters} m</span>
          </div>
          <input
            id="geofence-radius"
            type="range"
            min={10}
            max={5000}
            step={10}
            className="w-full accent-bento-primary"
            value={config.radiusMeters}
            onChange={(e) => setConfig((prev) => ({ ...prev, radiusMeters: parseInt(e.target.value, 10) }))}
          />
          <div className="flex justify-between text-[11px] text-bento-muted">
            <span>10 m</span>
            <span>5000 m (5 km)</span>
          </div>
          <input
            type="number"
            min={10}
            max={5000}
            className="w-full px-4 py-2.5 border border-bento-border rounded-xl text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
            value={config.radiusMeters}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                radiusMeters: Math.min(5000, Math.max(10, parseInt(e.target.value, 10) || 100)),
              }))
            }
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            id="btn-geofence-current-location"
            onClick={useCurrentLocation}
            disabled={locating}
            className="scout-btn-secondary text-sm py-2.5"
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            Pakai Lokasi Saya
          </button>
          <a
            href={geofenceMapsUrl(config)}
            target="_blank"
            rel="noopener noreferrer"
            className="scout-btn-secondary text-sm py-2.5"
          >
            <ExternalLink className="w-4 h-4" />
            Lihat di Peta
          </a>
        </div>

        <button type="submit" id="btn-save-geofence" disabled={saving} className="w-full scout-btn-primary py-3.5 text-sm">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan Pengaturan GPS
            </>
          )}
        </button>
      </form>
    </div>
  );
}
