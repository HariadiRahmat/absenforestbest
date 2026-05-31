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
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { normalizeUserProfile } from '../lib/normalizeUserProfile';
import { shouldFallbackToRedirect, shouldUseRedirectSignIn, getGoogleSignInErrorMessage } from '../lib/authErrors';
import { UserProfile, UserRole, UserStatus, OperationType, PurnaApprovalStatus } from '../types';
import { isPurnaProfileComplete, PurnaProfileFormData } from '../lib/purnaProfile';
import { normalizePurnaRegistration } from '../lib/purnaRegistration';
import { AuthGateStatus } from '../lib/authGate';
import { stripUndefined } from '../lib/firestoreUtils';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  authGate: AuthGateStatus;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  registerProfile: (nama: string, kelas: string, regu: string) => Promise<void>;
  updateProfileDetails: (nama: string, kelas: string, regu: string) => Promise<void>;
  updatePurnaProfile: (fields: PurnaProfileFormData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();

const BOOTSTRAP_ADMIN_EMAILS = new Set(
  [ADMIN_EMAIL, 'hariadirahmat2003@gmail.com', 'admin@gmail.com'].filter(Boolean) as string[]
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

  useEffect(() => {
    getRedirectResult(auth)
      .catch((err) => {
        console.error('Google redirect sign-in failed:', err);
        setAuthError(getGoogleSignInErrorMessage(err));
      });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      profileUnsubRef.current?.();
      profileUnsubRef.current = null;

      setCurrentUser(user);

      if (!user) {
        setUserProfile(null);
        setAuthGate(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userRef = doc(db, 'users', user.uid);

      const unsubscribeProfile = onSnapshot(
        userRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(normalizeUserProfile(user.uid, docSnap.data() as Record<string, unknown>));
            setAuthGate(null);
            setLoading(false);
            return;
          }

          try {
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

            const migrated = await migratePreRegisteredProfile(user, userRef);
            if (migrated) {
              setAuthGate(null);
              return;
            }

            const emailKey = user.email?.toLowerCase();
            if (emailKey) {
              const regSnap = await getDoc(doc(db, 'purna_registrations', emailKey));
              if (regSnap.exists()) {
                const reg = normalizePurnaRegistration(emailKey, regSnap.data() as Record<string, unknown>);
                if (reg.approvalStatus === PurnaApprovalStatus.PENDING) {
                  setAuthGate('purna_pending');
                  setUserProfile(null);
                  return;
                }
                if (reg.approvalStatus === PurnaApprovalStatus.REJECTED) {
                  setAuthGate('purna_rejected');
                  setUserProfile(null);
                  return;
                }
              }
            }

            setAuthGate('unregistered');
            setUserProfile(null);
          } catch (err) {
            console.error('Failed to resolve user profile:', err);
            if (err instanceof FirebaseError && err.code === 'permission-denied') {
              setAuthError(
                'Firestore Rules belum di-deploy ke Firebase. Buka Firebase Console → Firestore → Rules, salin isi firestore.rules dari repo, lalu klik Publish.'
              );
            }
            setAuthGate(null);
            setUserProfile(null);
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

    return () => {
      profileUnsubRef.current?.();
      unsubscribeAuth();
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
      await signOut(auth);
    } catch (error) {
      console.error('Error during log out:', error);
      throw error;
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
      const reg = normalizePurnaRegistration(emailKey, regSnap.data() as Record<string, unknown>);
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

    const userRef = doc(db, 'users', currentUser.uid);
    const updatedProfile = {
      ...userProfile,
      nama,
      kelas: userProfile.role === UserRole.ADMIN ? userProfile.kelas : kelas,
      regu: userProfile.role === UserRole.ADMIN ? userProfile.regu : regu,
    };

    try {
      await setDoc(userRef, stripUndefined(updatedProfile as Record<string, unknown>));
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
