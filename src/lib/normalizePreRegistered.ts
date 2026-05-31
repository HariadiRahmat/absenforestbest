import { PreRegisteredMember, UserRole, UserStatus } from '../types';

export function normalizePreRegistered(email: string, data: Record<string, unknown>): PreRegisteredMember {
  const rawRole = String(data.role ?? 'anggota').toLowerCase();
  let role = UserRole.ANGGOTA;
  if (rawRole === 'admin') role = UserRole.ADMIN;
  else if (rawRole === 'purna') role = UserRole.PURNA;

  const rawStatus = String(data.status ?? 'aktif').toLowerCase();
  const status = rawStatus === 'nonaktif' ? UserStatus.NON_AKTIF : UserStatus.AKTIF;

  const str = (key: string, max = 500) => {
    const v = data[key];
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
  };

  return {
    email: String(data.email ?? email).toLowerCase(),
    nama: String(data.nama ?? ''),
    kelas: String(data.kelas ?? ''),
    regu: String(data.regu ?? ''),
    status,
    role,
    createdAt: data.createdAt,
    tanggalLahir: str('tanggalLahir', 10),
    alamat: str('alamat', 500),
    agama: str('agama', 50),
    pendidikanSd: str('pendidikanSd', 120),
    pendidikanSmp: str('pendidikanSmp', 120),
    pendidikanSma: str('pendidikanSma', 120),
    pendidikanKuliah: str('pendidikanKuliah', 120),
    statusPerkawinan: str('statusPerkawinan', 30),
    profileComplete: data.profileComplete === true,
  };
}
