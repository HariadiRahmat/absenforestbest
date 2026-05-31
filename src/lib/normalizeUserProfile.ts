import { UserProfile, UserRole, UserStatus } from '../types';

function strField(data: Record<string, unknown>, key: string, max = 500): string | undefined {
  const v = data[key];
  if (typeof v !== 'string' || !v.trim()) return undefined;
  return v.trim().slice(0, max);
}

/** Map Firestore user docs (new + legacy Next.js schema) to UserProfile */
export function normalizeUserProfile(id: string, data: Record<string, unknown>): UserProfile {
  const rawRole = String(data.role ?? 'anggota').toLowerCase();
  let role = UserRole.ANGGOTA;
  if (rawRole === 'admin') role = UserRole.ADMIN;
  else if (rawRole === 'purna') role = UserRole.PURNA;

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
    tanggalLahir: strField(data, 'tanggalLahir', 10),
    alamat: strField(data, 'alamat', 500),
    agama: strField(data, 'agama', 50),
    pendidikanSd: strField(data, 'pendidikanSd', 120),
    pendidikanSmp: strField(data, 'pendidikanSmp', 120),
    pendidikanSma: strField(data, 'pendidikanSma', 120),
    pendidikanKuliah: strField(data, 'pendidikanKuliah', 120),
    statusPerkawinan: strField(data, 'statusPerkawinan', 30),
    profileComplete: data.profileComplete === true,
  };
}

export function sortByTimestampDesc<T extends { timestamp?: { seconds?: number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0));
}
