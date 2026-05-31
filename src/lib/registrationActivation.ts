import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { buildPreRegisteredFromApplication, defaultKelasReguForRole } from './memberApproval';
import { normalizeMemberRegistration } from './purnaRegistration';
import { stripUndefined } from './firestoreUtils';
import { MemberRegistration, PurnaApprovalStatus, UserProfile, UserRole } from '../types';

/** Buat atau perbaiki pre_registered dari pendaftaran yang sudah disetujui. */
export async function ensurePreRegisteredForApprovedApplication(
  app: MemberRegistration
): Promise<boolean> {
  const emailKey = app.email.toLowerCase();
  if (app.approvalStatus !== PurnaApprovalStatus.APPROVED) return false;

  const preRef = doc(db, 'pre_registered', emailKey);
  const preSnap = await getDoc(preRef);
  if (preSnap.exists()) return true;

  const role = app.approvedRole ?? UserRole.ANGGOTA;
  const defaults = defaultKelasReguForRole(role, app);
  const kelas = app.kelas?.trim() || defaults.kelas;
  const regu = app.regu?.trim() || defaults.regu;

  await setDoc(
    preRef,
    stripUndefined({
      ...buildPreRegisteredFromApplication(app, role, kelas, regu),
      createdAt: serverTimestamp(),
    })
  );
  return true;
}

export async function ensurePreRegisteredForApprovedEmail(email: string): Promise<boolean> {
  const emailKey = email.toLowerCase();
  const regSnap = await getDoc(doc(db, 'purna_registrations', emailKey));
  if (!regSnap.exists()) return false;

  const app = normalizeMemberRegistration(emailKey, regSnap.data() as Record<string, unknown>);
  return ensurePreRegisteredForApprovedApplication(app);
}

/** Disetujui admin tapi belum punya akun login (users). */
export function listApprovedAwaitingActivation(
  applications: MemberRegistration[],
  users: UserProfile[]
): MemberRegistration[] {
  const loggedInEmails = new Set(users.map((u) => u.email.toLowerCase()));

  return applications
    .filter(
      (app) =>
        app.approvalStatus === PurnaApprovalStatus.APPROVED
        && !loggedInEmails.has(app.email.toLowerCase())
    )
    .sort((a, b) => (b.reviewedAt?.seconds ?? b.submittedAt?.seconds ?? 0) - (a.reviewedAt?.seconds ?? a.submittedAt?.seconds ?? 0));
}
