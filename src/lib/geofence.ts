import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_GEOFENCE, GeofenceConfig } from '../types';

const GEOFENCE_DOC = 'geofence';

/** Haversine — jarak dua titik koordinat dalam meter */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizeGeofenceConfig(raw: Record<string, unknown>): GeofenceConfig {
  return {
    enabled: raw.enabled === true,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim().slice(0, 80) : DEFAULT_GEOFENCE.label,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : DEFAULT_GEOFENCE.latitude,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : DEFAULT_GEOFENCE.longitude,
    radiusMeters:
      typeof raw.radiusMeters === 'number'
        ? Math.min(5000, Math.max(10, Math.round(raw.radiusMeters)))
        : DEFAULT_GEOFENCE.radiusMeters,
    updatedAt: raw.updatedAt,
  };
}

export async function getGeofenceConfig(): Promise<GeofenceConfig> {
  const snap = await getDoc(doc(db, 'settings', GEOFENCE_DOC));
  if (!snap.exists()) return { ...DEFAULT_GEOFENCE };
  return normalizeGeofenceConfig(snap.data() as Record<string, unknown>);
}

/** Validasi posisi anggota terhadap geofence. Throw Error jika di luar area atau GPS kosong. */
export async function verifyGeofence(
  latitude: number | null,
  longitude: number | null
): Promise<{ distanceMeters: number | null; config: GeofenceConfig }> {
  const config = await getGeofenceConfig();
  if (!config.enabled) {
    return { distanceMeters: null, config };
  }

  if (latitude == null || longitude == null) {
    throw new Error(
      'GPS wajib aktif. Aktifkan izin lokasi di browser lalu muat ulang halaman sebelum absen.'
    );
  }

  const dist = distanceMeters(config.latitude, config.longitude, latitude, longitude);
  if (dist > config.radiusMeters) {
    throw new Error(
      `Anda ${Math.round(dist)} m dari ${config.label} (batas ${config.radiusMeters} m). Dekati area latihan untuk absen.`
    );
  }

  return { distanceMeters: dist, config };
}

/** Cek apakah koordinat berada dalam radius (untuk UI indicator) */
export function isWithinGeofence(
  config: GeofenceConfig,
  latitude: number | null,
  longitude: number | null
): boolean | null {
  if (!config.enabled) return null;
  if (latitude == null || longitude == null) return false;
  return distanceMeters(config.latitude, config.longitude, latitude, longitude) <= config.radiusMeters;
}

export function geofenceMapsUrl(config: GeofenceConfig): string {
  return `https://maps.google.com/?q=${config.latitude},${config.longitude}`;
}
