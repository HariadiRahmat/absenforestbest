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
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { shouldFallbackToRedirect, shouldUseRedirectSignIn, getGoogleSignInErrorMessage } from '../lib/authErrors';
import { UserProfile, UserRole, UserStatus, OperationType } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  registerProfile: (nama: string, kelas: string, regu: string) => Promise<void>;
  updateProfileDetails: (nama: string, kelas: string, regu: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();

function isBootstrapAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAIL ? email.toLowerCase() === ADMIN_EMAIL : false;
}

async function migratePreRegisteredProfile(user: FirebaseUser, userRef: ReturnType<typeof doc>): Promise<boolean> {
  const emailKey = user.email?.toLowerCase();
  if (!emailKey) return false;

  const preRef = doc(db, 'pre_registered', emailKey);
  const preSnap = await getDoc(preRef);
  if (!preSnap.exists()) return false;

  const pre = preSnap.data();
  const newProfile: UserProfile = {
    userId: user.uid,
    nama: pre.nama,
    email: emailKey,
    kelas: pre.kelas,
    regu: pre.regu,
    status: pre.status ?? UserStatus.AKTIF,
    role: pre.role ?? UserRole.ANGGOTA,
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, newProfile);
  await deleteDoc(preRef);
  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
        setLoading(false);
        return;
      }

      setLoading(true);
      const userRef = doc(db, 'users', user.uid);

      const unsubscribeProfile = onSnapshot(
        userRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
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
            if (!migrated) {
              setUserProfile(null);
            }
          } catch (err) {
            console.error('Failed to resolve user profile:', err);
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

    const userRef = doc(db, 'users', currentUser.uid);
    const emailKey = currentUser.email?.toLowerCase() ?? '';
    const preSnap = emailKey ? await getDoc(doc(db, 'pre_registered', emailKey)) : null;
    const pre = preSnap?.exists() ? preSnap.data() : null;

    const isAdmin = isBootstrapAdmin(currentUser.email);
    const newProfile: UserProfile = {
      userId: currentUser.uid,
      nama,
      email: emailKey,
      kelas: isAdmin ? 'Pembina' : kelas,
      regu: isAdmin ? 'Laksana' : regu,
      status: pre?.status ?? UserStatus.AKTIF,
      role: isAdmin ? UserRole.ADMIN : (pre?.role ?? UserRole.ANGGOTA),
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, newProfile);
      if (preSnap?.exists()) {
        await deleteDoc(doc(db, 'pre_registered', emailKey));
      }
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
        loading,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGoogle,
        logout,
        registerProfile,
        updateProfileDetails,
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
