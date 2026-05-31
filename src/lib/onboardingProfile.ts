/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, UserRole } from '../types';
import { AGAMA_OPTIONS, STATUS_PERKAWINAN_OPTIONS } from './purnaProfile';

export type MembershipStatus = 'aktif' | 'purna';

export const KELAS_OPTIONS = ['7', '8', '9'] as const;

export interface OnboardingFormData {
  namaDepan: string;
  namaBelakang: string;
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  agama: string;
  noHp: string;
  membershipStatus: MembershipStatus;
  kelas: string;
  regu: string;
  tahunMasuk: string;
  pendidikanSd: string;
  pendidikanSmp: string;
  pendidikanSma: string;
  pendidikanKuliah: string;
  statusPerkawinan: string;
}

export function emptyOnboardingForm(profile?: UserProfile | null): OnboardingFormData {
  const namaParts = (profile?.nama ?? '').trim().split(/\s+/);
  const namaDepan = profile?.namaDepan ?? namaParts[0] ?? '';
  const namaBelakang = profile?.namaBelakang ?? namaParts.slice(1).join(' ') ?? '';

  const defaultMembership: MembershipStatus =
    profile?.role === UserRole.PURNA || profile?.membershipStatus === 'purna' ? 'purna' : 'aktif';

  return {
    namaDepan,
    namaBelakang,
    tempatLahir: profile?.tempatLahir ?? '',
    tanggalLahir: profile?.tanggalLahir ?? '',
    alamat: profile?.alamat ?? '',
    agama: profile?.agama ?? AGAMA_OPTIONS[0],
    noHp: profile?.noHp ?? '',
    membershipStatus: profile?.membershipStatus ?? defaultMembership,
    kelas: profile?.kelas && KELAS_OPTIONS.includes(profile.kelas as (typeof KELAS_OPTIONS)[number])
      ? profile.kelas
      : '',
    regu: profile?.regu && profile.regu !== '-' ? profile.regu : '',
    tahunMasuk: profile?.tahunMasuk ?? '',
    pendidikanSd: profile?.pendidikanSd ?? '',
    pendidikanSmp: profile?.pendidikanSmp ?? '',
    pendidikanSma: profile?.pendidikanSma ?? '',
    pendidikanKuliah: profile?.pendidikanKuliah ?? '',
    statusPerkawinan: profile?.statusPerkawinan ?? STATUS_PERKAWINAN_OPTIONS[0],
  };
}

export function needsOnboarding(profile: UserProfile): boolean {
  if (profile.role === UserRole.ADMIN) return false;
  return !isOnboardingComplete(profile);
}

export function isOnboardingComplete(profile: UserProfile): boolean {
  if (profile.profileComplete === true) return true;

  // Profil lama yang sudah lengkap (sebelum wizard onboarding)
  if (
    profile.tanggalLahir?.trim() &&
    profile.alamat?.trim() &&
    profile.pendidikanSd?.trim() &&
    profile.statusPerkawinan?.trim()
  ) {
    return true;
  }

  return false;
}

export function validateMemberBiodataForm(form: OnboardingFormData): string | null {
  for (let step = 1; step <= 3; step += 1) {
    const err = validateOnboardingStep(step, form);
    if (err) return err;
  }
  return null;
}

export function membershipStatusLabel(status?: MembershipStatus | string | null): string {
  return status === 'purna' ? 'Sudah Purna' : 'Anggota Aktif';
}

export function validateOnboardingStep(step: number, form: OnboardingFormData): string | null {
  if (step === 1) {
    if (!form.namaDepan.trim()) return 'Nama depan wajib diisi.';
    if (!form.namaBelakang.trim()) return 'Nama belakang wajib diisi.';
    if (!form.tempatLahir.trim()) return 'Tempat lahir wajib diisi.';
    if (!form.tanggalLahir) return 'Tanggal lahir wajib diisi.';
    if (!form.alamat.trim()) return 'Alamat wajib diisi.';
    if (!form.agama.trim()) return 'Agama wajib dipilih.';
    return null;
  }

  if (step === 2) {
    if (!form.tahunMasuk.trim() || !/^\d{4}$/.test(form.tahunMasuk.trim())) {
      return 'Tahun masuk ForestBest wajib diisi (format: 2020).';
    }
    if (form.membershipStatus === 'aktif') {
      if (!KELAS_OPTIONS.includes(form.kelas as (typeof KELAS_OPTIONS)[number])) {
        return 'Pilih kelas saat ini (7, 8, atau 9).';
      }
      if (!form.regu.trim()) return 'Regu wajib diisi untuk anggota aktif.';
    }
    return null;
  }

  if (step === 3) {
    if (!form.pendidikanSd.trim()) return 'Nama SD wajib diisi.';
    if (!form.pendidikanSmp.trim()) return 'Nama SMP wajib diisi.';
    if (!form.pendidikanSma.trim()) return 'Nama SMA wajib diisi.';
    if (!form.statusPerkawinan.trim()) return 'Status pernikahan wajib dipilih.';
    return null;
  }

  return null;
}

export function onboardingFormToProfilePatch(form: OnboardingFormData): Record<string, unknown> {
  const nama = `${form.namaDepan.trim()} ${form.namaBelakang.trim()}`.trim();
  const isAktif = form.membershipStatus === 'aktif';

  return {
    nama,
    namaDepan: form.namaDepan.trim(),
    namaBelakang: form.namaBelakang.trim(),
    tempatLahir: form.tempatLahir.trim(),
    tanggalLahir: form.tanggalLahir.trim(),
    alamat: form.alamat.trim(),
    agama: form.agama.trim(),
    noHp: form.noHp.trim() || '',
    membershipStatus: form.membershipStatus,
    tahunMasuk: form.tahunMasuk.trim(),
    kelas: isAktif ? form.kelas.trim() : 'Purna',
    regu: isAktif ? form.regu.trim() : '-',
    pendidikanSd: form.pendidikanSd.trim(),
    pendidikanSmp: form.pendidikanSmp.trim(),
    pendidikanSma: form.pendidikanSma.trim(),
    pendidikanKuliah: form.pendidikanKuliah.trim(),
    statusPerkawinan: form.statusPerkawinan.trim(),
    profileComplete: true,
  };
}
