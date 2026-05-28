/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'admin',
  ANGGOTA = 'anggota',
}

export enum UserStatus {
  AKTIF = 'aktif',
  NON_AKTIF = 'nonaktif',
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
}

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
