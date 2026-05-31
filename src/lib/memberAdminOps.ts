import { deleteDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { isPreRegisteredUserId } from './purnaDirectory';
import { UserProfile, UserRole } from '../types';

/** Hapus semua jejak member (users, pre_registered, purna_registrations). */
export async function deleteMemberRecords(
  member: UserProfile,
  users: UserProfile[]
): Promise<void> {
  const email = member.email.toLowerCase();

  const loggedIn = users.find((u) => u.email.toLowerCase() === email);
  if (loggedIn) {
    await deleteDoc(doc(db, 'users', loggedIn.userId));
  } else if (!isPreRegisteredUserId(member.userId)) {
    await deleteDoc(doc(db, 'users', member.userId));
  }

  // deleteDoc tidak butuh izin get; hapus langsung (doc tidak ada = no-op).
  await deleteDoc(doc(db, 'pre_registered', email));
  await deleteDoc(doc(db, 'purna_registrations', email));
}

/** Sinkronkan approvedRole di purna_registrations setelah admin ubah role. */
export async function syncRegistrationApprovedRole(email: string, role: UserRole): Promise<void> {
  const regRef = doc(db, 'purna_registrations', email.toLowerCase());
  const regSnap = await getDoc(regRef);
  if (!regSnap.exists()) return;

  const status = String(regSnap.data()?.approvalStatus ?? '').toLowerCase();
  if (status !== 'approved') return;

  await updateDoc(regRef, {
    approvedRole: role,
    reviewedAt: serverTimestamp(),
  });
}
