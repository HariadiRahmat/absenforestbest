import { UserProfile, UserRole, UserStatus } from '../types';

/** Map Firestore user docs (new + legacy Next.js schema) to UserProfile */
export function normalizeUserProfile(id: string, data: Record<string, unknown>): UserProfile {
  const rawRole = String(data.role ?? 'anggota').toLowerCase();
  let role = UserRole.ANGGOTA;
  if (rawRole === 'admin') role = UserRole.ADMIN;

  const rawStatus = String(data.status ?? 'aktif').toLowerCase();
  const status = rawStatus === 'nonaktif' ? UserStatus.NON_AKTIF : UserStatus.AKTIF;

  return {
    userId: String(data.userId ?? id),
    nama: String(data.nama ?? data.name ?? 'Tanpa Nama'),
    email: String(data.email ?? ''),
    kelas: String(data.kelas ?? '-'),
    regu: String(data.regu ?? '-'),
    status,
    role,
    createdAt: data.createdAt,
  };
}

export function sortByTimestampDesc<T extends { timestamp?: { seconds?: number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0));
}
