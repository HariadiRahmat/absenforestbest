import { PurnaApprovalStatus, MemberRegistration, UserRole } from '../types';

function strField(data: Record<string, unknown>, key: string, max = 500): string | undefined {
  const v = data[key];
  if (typeof v !== 'string' || !v.trim()) return undefined;
  return v.trim().slice(0, max);
}

export function normalizeMemberRegistration(
  email: string,
  data: Record<string, unknown>
): MemberRegistration {
  const rawStatus = String(data.approvalStatus ?? 'pending').toLowerCase();
  let approvalStatus = PurnaApprovalStatus.PENDING;
  if (rawStatus === 'approved') approvalStatus = PurnaApprovalStatus.APPROVED;
  else if (rawStatus === 'rejected') approvalStatus = PurnaApprovalStatus.REJECTED;

  const rawRole = data.approvedRole ? String(data.approvedRole).toLowerCase() : '';
  let approvedRole: UserRole | undefined;
  if (rawRole === 'admin') approvedRole = UserRole.ADMIN;
  else if (rawRole === 'purna') approvedRole = UserRole.PURNA;
  else if (rawRole === 'anggota') approvedRole = UserRole.ANGGOTA;

  return {
    email: String(data.email ?? email).toLowerCase(),
    nama: String(data.nama ?? ''),
    kelas: strField(data, 'kelas', 20),
    regu: strField(data, 'regu', 30),
    tanggalLahir: strField(data, 'tanggalLahir', 10),
    alamat: strField(data, 'alamat', 500),
    agama: strField(data, 'agama', 50),
    pendidikanSd: strField(data, 'pendidikanSd', 120),
    pendidikanSmp: strField(data, 'pendidikanSmp', 120),
    pendidikanSma: strField(data, 'pendidikanSma', 120),
    pendidikanKuliah: strField(data, 'pendidikanKuliah', 120),
    statusPerkawinan: strField(data, 'statusPerkawinan', 30),
    approvalStatus,
    approvedRole,
    submittedAt: data.submittedAt,
    reviewedAt: data.reviewedAt,
  };
}

/** @deprecated Use normalizeMemberRegistration */
export const normalizePurnaRegistration = normalizeMemberRegistration;

export type PurnaGateStatus = 'pending' | 'rejected' | null;

/** @deprecated Use AuthGateStatus from authGate.ts */
export type { AuthGateStatus } from './authGate';
