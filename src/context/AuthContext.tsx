/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { normalizeUserProfile } from '../lib/normalizeUserProfile';
import { shouldFallbackToRedirect, shouldUseRedirectSignIn, getGoogleSignInErrorMessage, isMissingRedirectStateError } from '../lib/authErrors';
import { UserProfile, UserRole, UserStatus, OperationType, PurnaApprovalStatus } from '../types';
import { isPurnaProfileComplete, PurnaProfileFormData } from '../lib/purnaProfile';
import { normalizeMemberRegistration } from '../lib/purnaRegistration';
import { AuthGateStatus } from '../lib/authGate';
import { stripUndefined } from '../lib/firestoreUtils';
import { ensurePreRegisteredForApprovedEmail } from '../lib/registrationActivation';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  authGate: AuthGateStatus;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  retryProfileSetup: (options?: { silent?: boolean }) => Promise<void>;
  registerProfile: (nama: string, kelas: string, regu: string) => Promise<void>;
  updateProfileDetails: (nama: string, kelas: string, regu: string) => Promise<void>;
  updatePurnaProfile: (fields: PurnaProfileFormData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();

const BOOTSTRAP_ADMIN_EMAILS = new Set(
  [ADMIN_EMAIL, 'hariadirahmat2003@gmail.com', 'scoutforestbest@gmail.com', 'admin@gmail.com'].filter(Boolean) as string[]
);

function isBootstrapAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.has(email.toLowerCase());
}

async function migratePreRegisteredProfile(user: FirebaseUser, userRef: ReturnType<typeof doc>): Promise<boolean> {
  const emailKey = user.email?.toLowerCase();
  if (!emailKey) return false;

  const preRef = doc(db, 'pre_registered', emailKey);
  const preSnap = await getDoc(preRef);
  if (!preSnap.exists()) return false;

  const pre = preSnap.data();
  const role = (pre.role === UserRole.PURNA || pre.role === 'purna')
    ? UserRole.PURNA
    : pre.role === UserRole.ADMIN || pre.role === 'admin'
      ? UserRole.ADMIN
      : UserRole.ANGGOTA;

  const newProfile: UserProfile = {
    userId: user.uid,
    nama: pre.nama,
    email: emailKey,
    kelas: pre.kelas,
    regu: pre.regu,
    status: pre.status ?? UserStatus.AKTIF,
    role,
    createdAt: serverTimestamp(),
    tanggalLahir: pre.tanggalLahir,
    alamat: pre.alamat,
    agama: pre.agama,
    pendidikanSd: pre.pendidikanSd,
    pendidikanSmp: pre.pendidikanSmp,
    pendidikanSma: pre.pendidikanSma,
    pendidikanKuliah: pre.pendidikanKuliah,
    statusPerkawinan: pre.statusPerkawinan,
    profileComplete: role === UserRole.PURNA
      ? (pre.profileComplete === true || isPurnaProfileComplete({
          userId: user.uid,
          nama: pre.nama,
          email: emailKey,
          kelas: pre.kelas,
          regu: pre.regu,
          status: pre.status ?? UserStatus.AKTIF,
          role,
          createdAt: null,
          tanggalLahir: pre.tanggalLahir,
          alamat: pre.alamat,
          agama: pre.agama,
          pendidikanSd: pre.pendidikanSd,
          pendidikanSmp: pre.pendidikanSmp,
          pendidikanSma: pre.pendidikanSma,
          pendidikanKuliah: pre.pendidikanKuliah,
          statusPerkawinan: pre.statusPerkawinan,
        }))
      : undefined,
  };

  await setDoc(userRef, stripUndefined(newProfile as Record<string, unknown>));
  await deleteDoc(preRef);
  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authGate, setAuthGate] = useState<AuthGateStatus>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const profileUnsubRef = useRef<(() => void) | null>(null);
  const preRegisteredUnsubRef = useRef<(() => void) | null>(null);
  const activeProfileUidRef = useRef<string | null>(null);
  const migratingRef = useRef(false);
  const migrateInFlightRef = useRef<Promise<boolean> | null>(null);
  const currentUserRef = useRef<FirebaseUser | null>(null);

  const clearPreRegisteredListener = () => {
    preRegisteredUnsubRef.current?.();
    preRegisteredUnsubRef.current = null;
  };

  const safeMigrate = async (user: FirebaseUser, userRef: ReturnType<typeof doc>): Promise<boolean> => {
    if (migrateInFlightRef.current) {
      return migrateInFlightRef.current;
    }

    const run = (async () => {
      if (migratingRef.current) return false;
      migratingRef.current = true;
      try {
        return await migratePreRegisteredProfile(user, userRef);
      } catch (error) {
        console.error('Profile migration failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('permission') || message.includes('Permission')) {
          setAuthError(
            'Gagal mengaktifkan akun. Publish firestore.rules terbaru di Firebase Console, lalu tekan Perbarui Status lagi.'
          );
        } else {
          setAuthError('Gagal mengaktifkan akun. Hubungi Pembina atau tekan Perbarui Status lagi.');
        }
        return false;
      } finally {
        migratingRef.current = false;
      }
    })();

    migrateInFlightRef.current = run;
    try {
      return await run;
    } finally {
      migrateInFlightRef.current = null;
    }
  };

  const resolveRegistrationGate = async (emailKey: string): Promise<AuthGateStatus> => {
    const regSnap = await getDoc(doc(db, 'purna_registrations', emailKey));
    if (!regSnap.exists()) return 'unregistered';

    const reg = normalizeMemberRegistration(emailKey, regSnap.data() as Record<string, unknown>);
    if (reg.approvalStatus === PurnaApprovalStatus.PENDING) return 'purna_pending';
    if (reg.approvalStatus === PurnaApprovalStatus.REJECTED) return 'purna_rejected';
    if (reg.approvalStatus === PurnaApprovalStatus.APPROVED) {
      return 'approved_awaiting_login';
    }
    return 'unregistered';
  };

  const activateApprovedRegistration = async (user: FirebaseUser, userRef: ReturnType<typeof doc>) => {
    const emailKey = user.email?.toLowerCase();
    if (!emailKey) return false;

    try {
      setAuthError(null);
      await ensurePreRegisteredForApprovedEmail(emailKey);
      const migrated = await safeMigrate(user, userRef);
      if (migrated) {
        setAuthGate(null);
        clearPreRegisteredListener();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Activate approved registration failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setAuthError(message.includes('Kelas dan regu')
        ? message
        : 'Gagal menyiapkan aktivasi akun. Hubungi Pembina.');
      return false;
    }
  };

  const watchPreRegisteredForMigration = (user: FirebaseUser, userRef: ReturnType<typeof doc>) => {
    const emailKey = user.email?.toLowerCase();
    if (!emailKey) return;

    clearPreRegisteredListener();
    preRegisteredUnsubRef.current = onSnapshot(
      doc(db, 'pre_registered', emailKey),
      async (preSnap) => {
        if (!preSnap.exists() || currentUserRef.current?.uid !== user.uid) return;

        await activateApprovedRegistration(user, userRef);
      },
      (error) => {
        console.error('Pre-register snapshot error:', error);
      }
    );
  };

  const resolveSignedInUser = async (user: FirebaseUser) => {
    const userRef = doc(db, 'users', user.uid);
    const emailKey = user.email?.toLowerCase();

    if (isBootstrapAdmin(user.email)) {
      const newProfile: UserProfile = {
        userId: user.uid,
        nama: user.displayName || 'Pembina Pramuka',
        email: user.email!,
        kelas: 'Pembina',
        regu: 'Laksana',
        status: UserStatus.AKTIF,
        role: UserRole.ADMIN,
        createdAt: serverTimestamp(),
      };
      await setDoc(userRef, newProfile);
      return;
    }

    const migrated = await safeMigrate(user, userRef);
    if (migrated) {
      setAuthGate(null);
      clearPreRegisteredListener();
      return;
    }

    if (emailKey) {
      const gate = await resolveRegistrationGate(emailKey);
      setAuthGate(gate);
      setUserProfile(null);

      if (gate === 'approved_awaiting_login') {
        const activated = await activateApprovedRegistration(user, userRef);
        if (activated) return;
        watchPreRegisteredForMigration(user, userRef);
      } else if (gate === 'purna_pending') {
        watchPreRegisteredForMigration(user, userRef);
      } else {
        clearPreRegisteredListener();
      }
      return;
    }

    setAuthGate('unregistered');
    setUserProfile(null);
    clearPreRegisteredListener();
  };

  useEffect(() => {
    let cancelled = false;
    let unsubscribeAuth = () => {};

    const bootstrapAuth = async () => {
      try {
        await auth.authStateReady();
        if (cancelled) return;

        await getRedirectResult(auth).catch((err) => {
          if (isMissingRedirectStateError(err)) return;
          console.error('Google redirect sign-in failed:', err);
          setAuthError(getGoogleSignInErrorMessage(err));
        });
        if (cancelled) return;

        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
          clearPreRegisteredListener();

          currentUserRef.current = user;
          setCurrentUser(user);

          if (!user) {
            activeProfileUidRef.current = null;
            profileUnsubRef.current?.();
            profileUnsubRef.current = null;
            setUserProfile(null);
            setAuthGate(null);
            setLoading(false);
            return;
          }

          if (activeProfileUidRef.current === user.uid && profileUnsubRef.current) {
            setLoading(false);
            return;
          }

          activeProfileUidRef.current = user.uid;
          profileUnsubRef.current?.();
          profileUnsubRef.current = null;

          setLoading(true);
          const userRef = doc(db, 'users', user.uid);

          const unsubscribeProfile = onSnapshot(
            userRef,
            async (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile(normalizeUserProfile(user.uid, docSnap.data() as Record<string, unknown>));
                setAuthGate(null);
                clearPreRegisteredListener();
                setLoading(false);
                return;
              }

              try {
                await resolveSignedInUser(user);
              } catch (err) {
                console.error('Failed to resolve user profile:', err);
                if (err instanceof FirebaseError && err.code === 'permission-denied') {
                  setAuthError(
                    'Akses Firestore ditolak. Publish file firestore.rules terbaru di Firebase Console → Firestore → Rules → Publish. Jika memakai database non-default, publish rules ke database yang sama dengan VITE_FIREBASE_FIRESTORE_DATABASE_ID.'
                  );
                }
                setAuthGate(null);
                setUserProfile(null);
                clearPreRegisteredListener();
              } finally {
                setLoading(false);
              }
            },
            (error) => {
              console.error('Profile snapshot error:', error);
              setLoading(false);
            }
          );

          profileUnsubRef.current = unsubscribeProfile;
        });
      } catch (err) {
        console.error('Auth bootstrap failed:', err);
        if (!cancelled) setLoading(false);
      }
    };

    bootstrapAuth();

    return () => {
      cancelled = true;
      unsubscribeAuth();
      profileUnsubRef.current?.();
      clearPreRegisteredListener();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    if (shouldUseRedirectSignIn()) {
      await signInWithRedirect(auth, provider);
      return;
    }

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error during Google Sign In:', error);
      if (shouldFallbackToRedirect(error)) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      activeProfileUidRef.current = null;
      profileUnsubRef.current?.();
      profileUnsubRef.current = null;
      await signOut(auth);
    } catch (error) {
      console.error('Error during log out:', error);
      throw error;
    }
  };

  const retryProfileSetup = async (options?: { silent?: boolean }) => {
    const user = currentUserRef.current;
    if (!user) return;

    if (!options?.silent) setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const existing = await getDoc(userRef);
      if (existing.exists()) {
        setAuthGate(null);
        return;
      }
      await resolveSignedInUser(user);
    } catch (err) {
      console.error('Retry profile setup failed:', err);
      setAuthError(err instanceof Error ? err.message : 'Gagal mengaktifkan akun.');
      throw err;
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  const registerProfile = async (nama: string, kelas: string, regu: string) => {
    if (!currentUser) throw new Error('No authenticated user found');

    const emailKey = currentUser.email?.toLowerCase() ?? '';
    const preSnap = emailKey ? await getDoc(doc(db, 'pre_registered', emailKey)) : null;

    if (!preSnap?.exists()) {
      throw new Error('Email belum terdaftar oleh Pembina. Hubungi Pembina untuk mendapatkan akses.');
    }

    const regSnap = emailKey ? await getDoc(doc(db, 'purna_registrations', emailKey)) : null;
    if (regSnap?.exists()) {
      const reg = normalizeMemberRegistration(emailKey, regSnap.data() as Record<string, unknown>);
      if (reg.approvalStatus === PurnaApprovalStatus.PENDING) {
        throw new Error('Pendaftaran Purna Anda masih menunggu konfirmasi admin.');
      }
    }

    const pre = preSnap.data();

    const isAdmin = isBootstrapAdmin(currentUser.email);
    const userRef = doc(db, 'users', currentUser.uid);
    const newProfile: UserProfile = {
      userId: currentUser.uid,
      nama: pre.nama || nama,
      email: emailKey,
      kelas: isAdmin ? 'Pembina' : (pre.kelas || kelas),
      regu: isAdmin ? 'Laksana' : (pre.regu || regu),
      status: pre.status ?? UserStatus.AKTIF,
      role: isAdmin
        ? UserRole.ADMIN
        : pre.role === UserRole.PURNA || pre.role === 'purna'
          ? UserRole.PURNA
          : pre.role === UserRole.ADMIN || pre.role === 'admin'
            ? UserRole.ADMIN
            : UserRole.ANGGOTA,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, newProfile);
      await deleteDoc(doc(db, 'pre_registered', emailKey));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}`);
    }
  };

  const updateProfileDetails = async (nama: string, kelas: string, regu: string) => {
    if (!currentUser || !userProfile) throw new Error('No user profile to update');

    const trimmedName = nama.trim();
    const trimmedKelas = kelas.trim();
    const trimmedRegu = regu.trim();
    const userRef = doc(db, 'users', currentUser.uid);
    const nextKelas = userProfile.role === UserRole.ADMIN ? userProfile.kelas : trimmedKelas;
    const nextRegu = userProfile.role === UserRole.ADMIN ? userProfile.regu : trimmedRegu;
    const patch = {
      nama: trimmedName,
      kelas: nextKelas,
      regu: nextRegu,
    };

    try {
      await updateDoc(userRef, patch);
      setUserProfile({
        ...userProfile,
        ...patch,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const updatePurnaProfile = async (fields: PurnaProfileFormData) => {
    if (!currentUser || !userProfile || userProfile.role !== UserRole.PURNA) {
      throw new Error('Profil purna tidak ditemukan.');
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const updatedProfile: UserProfile = {
      ...userProfile,
      nama: fields.nama.trim(),
      tanggalLahir: fields.tanggalLahir.trim(),
      alamat: fields.alamat.trim(),
      agama: fields.agama.trim(),
      pendidikanSd: fields.pendidikanSd.trim(),
      pendidikanSmp: fields.pendidikanSmp.trim(),
      pendidikanSma: fields.pendidikanSma.trim(),
      pendidikanKuliah: fields.pendidikanKuliah.trim(),
      statusPerkawinan: fields.statusPerkawinan.trim(),
      profileComplete: false,
    };
    updatedProfile.profileComplete = isPurnaProfileComplete(updatedProfile);

    try {
      await setDoc(userRef, updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        authGate,
        loading,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGoogle,
        logout,
        retryProfileSetup,
        registerProfile,
        updateProfileDetails,
        updatePurnaProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
