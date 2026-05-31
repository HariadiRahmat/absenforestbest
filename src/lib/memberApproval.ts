import { MemberRegistration, UserProfile, UserRole, UserStatus } from '../types';
import { isPurnaProfileComplete } from './purnaProfile';

export function defaultKelasReguForRole(role: UserRole, app: MemberRegistration) {
  if (role === UserRole.ADMIN) {
    return { kelas: 'Pembina', regu: 'Staf' };
  }
  if (role === UserRole.PURNA) {
    return { kelas: 'Purna', regu: 'Alumni' };
  }
  return {
    kelas: app.kelas?.trim() || '-',
    regu: app.regu?.trim() || '-',
  };
}

export function buildPreRegisteredFromApplication(
  app: MemberRegistration,
  role: UserRole,
  kelas: string,
  regu: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    nama: app.nama,
    email: app.email.toLowerCase(),
    kelas,
    regu,
    role,
    status: UserStatus.AKTIF,
    profileComplete: role === UserRole.ADMIN,
  };

  if (role === UserRole.PURNA) {
    if (app.tanggalLahir) base.tanggalLahir = app.tanggalLahir;
    if (app.alamat) base.alamat = app.alamat;
    if (app.agama) base.agama = app.agama;
    if (app.pendidikanSd) base.pendidikanSd = app.pendidikanSd;
    if (app.pendidikanSmp) base.pendidikanSmp = app.pendidikanSmp;
    if (app.pendidikanSma) base.pendidikanSma = app.pendidikanSma;
    if (app.pendidikanKuliah) base.pendidikanKuliah = app.pendidikanKuliah;
    if (app.statusPerkawinan) base.statusPerkawinan = app.statusPerkawinan;
    if (
      app.tanggalLahir &&
      app.alamat &&
      app.pendidikanSd &&
      app.statusPerkawinan
    ) {
      const draft: UserProfile = {
        userId: 'draft',
        nama: app.nama,
        email: app.email,
        kelas,
        regu,
        status: UserStatus.AKTIF,
        role: UserRole.PURNA,
        createdAt: null,
        tanggalLahir: app.tanggalLahir,
        alamat: app.alamat,
        agama: app.agama,
        pendidikanSd: app.pendidikanSd,
        pendidikanSmp: app.pendidikanSmp,
        pendidikanSma: app.pendidikanSma,
        pendidikanKuliah: app.pendidikanKuliah,
        statusPerkawinan: app.statusPerkawinan,
      };
      base.profileComplete = isPurnaProfileComplete(draft);
    }
  }

  return base;
}
