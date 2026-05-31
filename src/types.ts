/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'admin',
  ANGGOTA = 'anggota',
  PURNA = 'purna',
}

export enum UserStatus {
  AKTIF = 'aktif',
  NON_AKTIF = 'nonaktif',
}

export enum PurnaApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AttendanceStatus {
  HADIR = 'hadir',
  TIDAK_HADIR = 'tidak hadir',
}

export interface UserProfile {
  userId: string;
  nama: string;
  email: string;
  kelas: string;
  regu: string;
  status: UserStatus;
  role: UserRole;
  createdAt: any; // Firestore Timestamp
  /** Purna-only fields */
  tanggalLahir?: string;
  alamat?: string;
  agama?: string;
  pendidikanSd?: string;
  pendidikanSmp?: string;
  pendidikanSma?: string;
  pendidikanKuliah?: string;
  statusPerkawinan?: string;
  profileComplete?: boolean;
}

/** Pre-register entry before first Google login */
export interface PreRegisteredMember {
  email: string;
  nama: string;
  kelas: string;
  regu: string;
  status: UserStatus;
  role: UserRole;
  createdAt?: unknown;
  tanggalLahir?: string;
  alamat?: string;
  agama?: string;
  pendidikanSd?: string;
  pendidikanSmp?: string;
  pendidikanSma?: string;
  pendidikanKuliah?: string;
  statusPerkawinan?: string;
  profileComplete?: boolean;
}

/** Link dokumentasi kegiatan untuk Purna — disimpan di settings/purna_links */
export interface PurnaDocumentationLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  order: number;
}

export interface PurnaLinksConfig {
  links: PurnaDocumentationLink[];
  updatedAt?: any;
}

export const DEFAULT_PURNA_LINKS: PurnaLinksConfig = {
  links: [],
};

/** Pendaftaran akun baru via halaman Register — menunggu konfirmasi admin */
export interface MemberRegistration {
  email: string;
  nama: string;
  kelas?: string;
  regu?: string;
  tanggalLahir?: string;
  alamat?: string;
  agama?: string;
  pendidikanSd?: string;
  pendidikanSmp?: string;
  pendidikanSma?: string;
  pendidikanKuliah?: string;
  statusPerkawinan?: string;
  approvalStatus: PurnaApprovalStatus;
  approvedRole?: UserRole;
  submittedAt?: any;
  reviewedAt?: any;
}

/** @deprecated Use MemberRegistration */
export type PurnaRegistration = MemberRegistration;

export interface AttendanceRecord {
  id?: string;
  userId: string;
  nama: string;
  tanggal: string; // YYYY-MM-DD
  timestamp: any; // Firestore Timestamp
  latitude: number | null;
  longitude: number | null;
  status: AttendanceStatus;
  qrToken: string;
}

export interface QRCodeConfig {
  date: string; // YYYY-MM-DD
  token: string;
  active: boolean;
  createdAt: any; // Firestore Timestamp
  expiresAt: any; // Firestore Timestamp
}

/** Pengaturan geofence lokasi latihan — disimpan di settings/geofence */
export interface GeofenceConfig {
  enabled: boolean;
  label: string;
  latitude: number;
  longitude: number;
  /** Jarak maksimum dari pusat lokasi, dalam meter */
  radiusMeters: number;
  updatedAt?: any;
}

export const DEFAULT_GEOFENCE: GeofenceConfig = {
  enabled: false,
  label: 'Lokasi Latihan',
  latitude: -5.0895,
  longitude: 119.6107,
  radiusMeters: 100,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
