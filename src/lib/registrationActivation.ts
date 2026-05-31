import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { buildPreRegisteredFromApplication, defaultKelasReguForRole } from './memberApproval';
import { normalizeMemberRegistration } from './purnaRegistration';
import { stripUndefined } from './firestoreUtils';
import { MemberRegistration, PurnaApprovalStatus, PreRegisteredMember, UserProfile, UserRole } from '../types';

export type PreRegisterRepairResult = 'created' | 'updated';

function resolveRoleAndClass(app: MemberRegistration): {
  role: UserRole;
  kelas: string;
  regu: string;
} {
  const role = app.approvedRole ?? UserRole.ANGGOTA;
  const defaults = defaultKelasReguForRole(role, app);
  const kelas = app.kelas?.trim() || defaults.kelas;
  const regu = app.regu?.trim() || defaults.regu;

  if (role === UserRole.ANGGOTA) {
    return {
      role,
      kelas: kelas && kelas !== '-' ? kelas : 'Belum diisi',
      regu: regu && regu !== '-' ? regu : 'Belum diisi',
    };
  }

  return { role, kelas, regu };
}

/** Buat atau perbaiki pre_registered dari pendaftaran yang sudah disetujui. */
export async function ensurePreRegisteredForApprovedApplication(
  app: MemberRegistration
): Promise<PreRegisterRepairResult> {
  const emailKey = app.email.toLowerCase();
  if (app.approvalStatus !== PurnaApprovalStatus.APPROVED) {
    throw new Error('Pendaftaran belum berstatus disetujui.');
  }

  const { role, kelas, regu } = resolveRoleAndClass(app);
  const preRef = doc(db, 'pre_registered', emailKey);
  const preSnap = await getDoc(preRef);

  await setDoc(
    preRef,
    stripUndefined({
      ...buildPreRegisteredFromApplication(app, role, kelas, regu),
      createdAt: preSnap.exists() ? preSnap.data()?.createdAt ?? serverTimestamp() : serverTimestamp(),
    }),
    { merge: true }
  );

  return preSnap.exists() ? 'updated' : 'created';
}

export async function ensurePreRegisteredForApprovedEmail(email: string): Promise<PreRegisterRepairResult> {
  const emailKey = email.toLowerCase();
  const regSnap = await getDoc(doc(db, 'purna_registrations', emailKey));
  if (!regSnap.exists()) {
    throw new Error('Data pendaftaran tidak ditemukan.');
  }

  const app = normalizeMemberRegistration(emailKey, regSnap.data() as Record<string, unknown>);
  return ensurePreRegisteredForApprovedApplication(app);
}

/** Disetujui admin, belum login, dan pre_register belum disiapkan Pembina. */
export function listApprovedAwaitingActivation(
  applications: MemberRegistration[],
  users: UserProfile[],
  preRegistered: PreRegisteredMember[] = [],
  hideEmails: string[] = []
): MemberRegistration[] {
  const loggedInEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const preparedEmails = new Set([
    ...preRegistered.map((p) => p.email.toLowerCase()),
    ...hideEmails.map((email) => email.toLowerCase()),
  ]);

  return applications
    .filter(
      (app) =>
        app.approvalStatus === PurnaApprovalStatus.APPROVED
        && !loggedInEmails.has(app.email.toLowerCase())
        && !preparedEmails.has(app.email.toLowerCase())
    )
    .sort((a, b) => (b.reviewedAt?.seconds ?? b.submittedAt?.seconds ?? 0) - (a.reviewedAt?.seconds ?? a.submittedAt?.seconds ?? 0));
}

export function formatActivationReadyMessage(email: string, result: PreRegisterRepairResult): string {
  const action = result === 'created' ? 'disiapkan' : 'diperbarui';
  return `Aktivasi ${action} untuk ${email}. Pengguna yang sedang menunggu akan masuk otomatis.`;
}

export function getActivationErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  const raw = String(err);
  if (raw.includes('permission') || raw.includes('Permission')) {
    return 'Akses Firestore ditolak. Publish firestore.rules terbaru di Firebase Console.';
  }
  return 'Gagal menyiapkan aktivasi akun. Coba lagi.';
}
