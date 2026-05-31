import { PurnaApprovalStatus, PurnaRegistration } from '../types';

export function normalizePurnaRegistration(
  email: string,
  data: Record<string, unknown>
): PurnaRegistration {
  const rawStatus = String(data.approvalStatus ?? 'pending').toLowerCase();
  let approvalStatus = PurnaApprovalStatus.PENDING;
  if (rawStatus === 'approved') approvalStatus = PurnaApprovalStatus.APPROVED;
  else if (rawStatus === 'rejected') approvalStatus = PurnaApprovalStatus.REJECTED;

  return {
    email: String(data.email ?? email),
    nama: String(data.nama ?? ''),
    tanggalLahir: String(data.tanggalLahir ?? ''),
    alamat: String(data.alamat ?? ''),
    agama: String(data.agama ?? ''),
    pendidikanSd: String(data.pendidikanSd ?? ''),
    pendidikanSmp: String(data.pendidikanSmp ?? ''),
    pendidikanSma: String(data.pendidikanSma ?? ''),
    pendidikanKuliah: data.pendidikanKuliah ? String(data.pendidikanKuliah) : undefined,
    statusPerkawinan: String(data.statusPerkawinan ?? ''),
    approvalStatus,
    submittedAt: data.submittedAt,
    reviewedAt: data.reviewedAt,
  };
}

export type PurnaGateStatus = 'pending' | 'rejected' | null;
