import { UserProfile } from '../types';

export interface PurnaProfileFormData {
  nama: string;
  tanggalLahir: string;
  alamat: string;
  agama: string;
  pendidikanSd: string;
  pendidikanSmp: string;
  pendidikanSma: string;
  pendidikanKuliah: string;
  statusPerkawinan: string;
}

export const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'] as const;

export const STATUS_PERKAWINAN_OPTIONS = ['Belum Menikah', 'Menikah', 'Cerai'] as const;

export function isPurnaProfileComplete(profile: UserProfile): boolean {
  if (profile.profileComplete === true) return true;
  return Boolean(
    profile.nama?.trim() &&
      profile.tanggalLahir?.trim() &&
      profile.alamat?.trim() &&
      profile.agama?.trim() &&
      profile.pendidikanSd?.trim() &&
      profile.pendidikanSmp?.trim() &&
      profile.pendidikanSma?.trim() &&
      profile.statusPerkawinan?.trim()
  );
}

export function purnaFormFromProfile(profile: UserProfile): PurnaProfileFormData {
  return {
    nama: profile.nama ?? '',
    tanggalLahir: profile.tanggalLahir ?? '',
    alamat: profile.alamat ?? '',
    agama: profile.agama ?? '',
    pendidikanSd: profile.pendidikanSd ?? '',
    pendidikanSmp: profile.pendidikanSmp ?? '',
    pendidikanSma: profile.pendidikanSma ?? '',
    pendidikanKuliah: profile.pendidikanKuliah ?? '',
    statusPerkawinan: profile.statusPerkawinan ?? '',
  };
}
