/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { UserProfile, UserRole, UserStatus, OperationType } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  registerProfile: (nama: string, kelas: string, regu: string) => Promise<void>;
  updateProfileDetails: (nama: string, kelas: string, regu: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Realtime subscription to the user's profile doc in firestore
      const userRef = doc(db, 'users', user.uid);
      const unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
          setLoading(false);
        } else {
          // If profile document does not exist, check if current user is the bootstrapped owner
          if (user.email === 'hariadirahmat2003@gmail.com') {
            try {
              // Automatically register the owner as Admin to prevent locking
              const newProfile: UserProfile = {
                userId: user.uid,
                nama: user.displayName || 'Pembina Pramuka',
                email: user.email,
                kelas: 'Pembina',
                regu: 'Laksana',
                status: UserStatus.AKTIF,
                role: UserRole.ADMIN,
                createdAt: serverTimestamp(),
              };
              await setDoc(userRef, newProfile);
            } catch (err) {
              console.error('Failed to auto-register admin:', err);
            }
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setLoading(false);
      });

      return () => unsubscribeProfile();
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error during Google Sign In:', error);
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
    const resolvedRole = currentUser.email === 'hariadirahmat2003@gmail.com' ? UserRole.ADMIN : UserRole.ANGGOTA;
    const resolvedKelas = currentUser.email === 'hariadirahmat2003@gmail.com' ? 'Pembina' : kelas;
    const resolvedRegu = currentUser.email === 'hariadirahmat2003@gmail.com' ? 'Laksana' : regu;

    const newProfile: UserProfile = {
      userId: currentUser.uid,
      nama,
      email: currentUser.email || '',
      kelas: resolvedKelas,
      regu: resolvedRegu,
      status: UserStatus.AKTIF,
      role: resolvedRole,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, newProfile);
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
