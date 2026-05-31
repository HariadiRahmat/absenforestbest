import { filterUsersByRole } from './filterUsers';
import {
  PurnaApprovalStatus,
  PurnaRegistration,
  PreRegisteredMember,
  UserProfile,
  UserRole,
  UserStatus,
} from '../types';

export const PRE_REGISTERED_USER_PREFIX = 'pre:';

export function isPreRegisteredUserId(userId: string): boolean {
  return userId.startsWith(PRE_REGISTERED_USER_PREFIX);
}

export function preRegisteredUserId(email: string): string {
  return `${PRE_REGISTERED_USER_PREFIX}${email.toLowerCase()}`;
}

function preRegisteredToProfile(entry: PreRegisteredMember): UserProfile {
  return {
    userId: preRegisteredUserId(entry.email),
    nama: entry.nama,
    email: entry.email.toLowerCase(),
    kelas: entry.kelas || 'Purna',
    regu: entry.regu || 'Alumni',
    status: entry.status ?? UserStatus.AKTIF,
    role: UserRole.PURNA,
    createdAt: entry.createdAt,
    tanggalLahir: entry.tanggalLahir,
    alamat: entry.alamat,
    agama: entry.agama,
    pendidikanSd: entry.pendidikanSd,
    pendidikanSmp: entry.pendidikanSmp,
    pendidikanSma: entry.pendidikanSma,
    pendidikanKuliah: entry.pendidikanKuliah,
    statusPerkawinan: entry.statusPerkawinan,
    profileComplete: entry.profileComplete,
  };
}

function approvedApplicationToProfile(app: PurnaRegistration): UserProfile {
  return {
    userId: preRegisteredUserId(app.email),
    nama: app.nama,
    email: app.email.toLowerCase(),
    kelas: app.kelas?.trim() || 'Purna',
    regu: app.regu?.trim() || 'Alumni',
    status: UserStatus.AKTIF,
    role: UserRole.PURNA,
    createdAt: app.reviewedAt ?? app.submittedAt,
    tanggalLahir: app.tanggalLahir,
    alamat: app.alamat,
    agama: app.agama,
    pendidikanSd: app.pendidikanSd,
    pendidikanSmp: app.pendidikanSmp,
    pendidikanSma: app.pendidikanSma,
    pendidikanKuliah: app.pendidikanKuliah,
    statusPerkawinan: app.statusPerkawinan,
    profileComplete: Boolean(app.tanggalLahir && app.alamat && app.pendidikanSd),
  };
}

/** Gabungkan user aktif, pre-register, dan purna disetujui yang belum login. */
export function buildPurnaDirectoryList(
  users: UserProfile[],
  preRegistered: PreRegisteredMember[],
  purnaApplications: PurnaRegistration[],
  search: string
): UserProfile[] {
  const seenEmails = new Set<string>();
  const list: UserProfile[] = [];

  for (const user of users) {
    if (user.role !== UserRole.PURNA) continue;
    const email = user.email.toLowerCase();
    seenEmails.add(email);
    list.push(user);
  }

  for (const entry of preRegistered) {
    const role = String(entry.role ?? '').toLowerCase();
    if (role !== UserRole.PURNA && role !== 'purna') continue;
    const email = entry.email.toLowerCase();
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    list.push(preRegisteredToProfile(entry));
  }

  for (const app of purnaApplications) {
    if (app.approvalStatus !== PurnaApprovalStatus.APPROVED) continue;
    if (app.approvedRole && app.approvedRole !== UserRole.PURNA) continue;
    const email = app.email.toLowerCase();
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    list.push(approvedApplicationToProfile(app));
  }

  list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

  return filterUsersByRole(list, UserRole.PURNA, search, 'ALL', 'ALL', false);
}
