import { filterUsersByRole } from './filterUsers';
import {
  MemberRegistration,
  PurnaApprovalStatus,
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

function defaultKelasReguForRole(role: UserRole): { kelas: string; regu: string } {
  if (role === UserRole.ADMIN) return { kelas: 'Pembina', regu: 'Staf' };
  if (role === UserRole.PURNA) return { kelas: 'Purna', regu: 'Alumni' };
  return { kelas: '-', regu: '-' };
}

function preRegisteredToProfile(entry: PreRegisteredMember): UserProfile {
  const role = entry.role ?? UserRole.ANGGOTA;
  const defaults = defaultKelasReguForRole(role);

  return {
    userId: preRegisteredUserId(entry.email),
    nama: entry.nama,
    email: entry.email.toLowerCase(),
    kelas: entry.kelas?.trim() || defaults.kelas,
    regu: entry.regu?.trim() || defaults.regu,
    status: entry.status ?? UserStatus.AKTIF,
    role,
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

function approvedApplicationToProfile(app: MemberRegistration, role: UserRole): UserProfile {
  const defaults = defaultKelasReguForRole(role);

  return {
    userId: preRegisteredUserId(app.email),
    nama: app.nama,
    email: app.email.toLowerCase(),
    kelas: app.kelas?.trim() || defaults.kelas,
    regu: app.regu?.trim() || defaults.regu,
    status: UserStatus.AKTIF,
    role,
    createdAt: app.reviewedAt ?? app.submittedAt,
    tanggalLahir: app.tanggalLahir,
    alamat: app.alamat,
    agama: app.agama,
    pendidikanSd: app.pendidikanSd,
    pendidikanSmp: app.pendidikanSmp,
    pendidikanSma: app.pendidikanSma,
    pendidikanKuliah: app.pendidikanKuliah,
    statusPerkawinan: app.statusPerkawinan,
    profileComplete: role === UserRole.PURNA
      ? Boolean(app.tanggalLahir && app.alamat && app.pendidikanSd)
      : undefined,
  };
}

/** Gabungkan user aktif, pre-register, dan pendaftar disetujui yang belum login. */
export function buildMemberDirectoryList(
  role: UserRole,
  users: UserProfile[],
  preRegistered: PreRegisteredMember[],
  applications: MemberRegistration[],
  search: string,
  reguFilter = 'ALL',
  kelasFilter = 'ALL',
  applyClassSquadFilters = false
): UserProfile[] {
  const seenEmails = new Set<string>();
  const claimedEmails = new Set<string>();
  const list: UserProfile[] = [];

  for (const user of users) {
    claimedEmails.add(user.email.toLowerCase());
  }
  for (const entry of preRegistered) {
    claimedEmails.add(entry.email.toLowerCase());
  }

  for (const user of users) {
    if (user.role !== role) continue;
    const email = user.email.toLowerCase();
    seenEmails.add(email);
    list.push(user);
  }

  for (const entry of preRegistered) {
    if (entry.role !== role) continue;
    const email = entry.email.toLowerCase();
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    list.push(preRegisteredToProfile(entry));
  }

  for (const app of applications) {
    if (app.approvalStatus !== PurnaApprovalStatus.APPROVED) continue;
    const appRole = app.approvedRole ?? UserRole.PURNA;
    if (appRole !== role) continue;
    const email = app.email.toLowerCase();
    if (seenEmails.has(email) || claimedEmails.has(email)) continue;
    seenEmails.add(email);
    list.push(approvedApplicationToProfile(app, appRole));
  }

  list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

  return filterUsersByRole(list, role, search, reguFilter, kelasFilter, applyClassSquadFilters);
}

/** @deprecated Use buildMemberDirectoryList */
export function buildPurnaDirectoryList(
  users: UserProfile[],
  preRegistered: PreRegisteredMember[],
  purnaApplications: MemberRegistration[],
  search: string
): UserProfile[] {
  return buildMemberDirectoryList(
    UserRole.PURNA,
    users,
    preRegistered,
    purnaApplications,
    search,
    'ALL',
    'ALL',
    false
  );
}

export interface MemberRoleStats {
  total: number;
  anggota: number;
  pembina: number;
  purna: number;
}

/** Hitung anggota per role — sama dengan daftar di Kelola (users + pre_registered + disetujui). */
export function buildMemberRoleStats(
  users: UserProfile[],
  preRegistered: PreRegisteredMember[],
  applications: MemberRegistration[]
): MemberRoleStats {
  const anggota = buildMemberDirectoryList(
    UserRole.ANGGOTA,
    users,
    preRegistered,
    applications,
    '',
    'ALL',
    'ALL',
    false
  ).length;

  const pembina = buildMemberDirectoryList(
    UserRole.ADMIN,
    users,
    preRegistered,
    applications,
    '',
    'ALL',
    'ALL',
    false
  ).length;

  const purna = buildMemberDirectoryList(
    UserRole.PURNA,
    users,
    preRegistered,
    applications,
    '',
    'ALL',
    'ALL',
    false
  ).length;

  return {
    total: anggota + pembina + purna,
    anggota,
    pembina,
    purna,
  };
}

/** Anggota aktif yang sudah login — dipakai untuk target absensi. */
export function countActiveLoggedInAnggota(users: UserProfile[]): number {
  return users.filter(
    (u) => u.role === UserRole.ANGGOTA && u.status !== UserStatus.NON_AKTIF
  ).length;
}
