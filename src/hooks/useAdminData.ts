import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, logFirestoreError } from '../lib/firebase';
import { normalizeUserProfile, sortByTimestampDesc } from '../lib/normalizeUserProfile';
import { normalizePurnaRegistration } from '../lib/purnaRegistration';
import { getTodayStr } from '../lib/dateUtils';
import {
  UserProfile,
  AttendanceRecord,
  QRCodeConfig,
  PurnaRegistration,
  PreRegisteredMember,
  OperationType,
} from '../types';
import { normalizePreRegistered } from '../lib/normalizePreRegistered';

export function useAdminData() {
  const todayStr = getTodayStr();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceRecord[]>([]);
  const [historicalAttendance, setHistoricalAttendance] = useState<AttendanceRecord[]>([]);
  const [purnaApplications, setPurnaApplications] = useState<PurnaRegistration[]>([]);
  const [preRegistered, setPreRegistered] = useState<PreRegisteredMember[]>([]);
  const [activeQR, setActiveQR] = useState<QRCodeConfig | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingPurna, setLoadingPurna] = useState(true);
  const [loadHistorical, setLoadHistorical] = useState(false);

  const syncActiveCheckin = useCallback(async (qr: QRCodeConfig) => {
    await setDoc(
      doc(db, 'settings', 'active_checkin'),
      {
        date: qr.date,
        token: qr.token,
        active: qr.active ?? true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, []);

  const autoGenerateTodayQR = useCallback(async () => {
    setLoadingQR(true);
    try {
      const randToken =
        'SBT_' +
        Math.random().toString(36).substring(2, 10).toUpperCase() +
        '_' +
        Date.now().toString().slice(-4);
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);

      const qrConfig: QRCodeConfig = {
        date: todayStr,
        token: randToken,
        active: true,
        createdAt: serverTimestamp(),
        expiresAt: midnight,
      };

      await setDoc(doc(db, 'qr_codes', todayStr), qrConfig);
      await syncActiveCheckin(qrConfig);
    } catch (err) {
      console.error('Auto generate QR failed:', err);
    } finally {
      setLoadingQR(false);
    }
  }, [todayStr, syncActiveCheckin]);

  useEffect(() => {
    setLoadingMembers(true);
    const unsubUsers = onSnapshot(
      query(collection(db, 'users')),
      (snapshot) => {
        const uList: UserProfile[] = [];
        snapshot.forEach((d) => {
          uList.push(normalizeUserProfile(d.id, d.data() as Record<string, unknown>));
        });
        uList.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setUsers(uList);
        setLoadingMembers(false);
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, 'users');
        setLoadingMembers(false);
      }
    );

    const unsubAttend = onSnapshot(
      query(collection(db, 'attendance'), where('tanggal', '==', todayStr)),
      (snapshot) => {
        const aList: AttendanceRecord[] = [];
        snapshot.forEach((d) => {
          aList.push({ id: d.id, ...d.data() } as AttendanceRecord);
        });
        setAttendanceToday(sortByTimestampDesc(aList));
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, 'attendance');
      }
    );

    const qrRef = doc(db, 'qr_codes', todayStr);
    const unsubQR = onSnapshot(
      qrRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const qrData = docSnap.data() as QRCodeConfig;
          setActiveQR(qrData);
          try {
            await syncActiveCheckin(qrData);
          } catch (err) {
            console.warn('Sync active_checkin failed:', err);
          }
        } else {
          await autoGenerateTodayQR();
        }
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `qr_codes/${todayStr}`);
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('permission') || msg.includes('Permission')) {
          setRulesError(
            'Firestore Rules belum di-publish. Buka Firebase Console → Firestore → Rules → salin file firestore.rules dari repo → Publish.'
          );
        }
      }
    );

    const unsubPurna = onSnapshot(
      query(collection(db, 'purna_registrations')),
      (snapshot) => {
        const list: PurnaRegistration[] = [];
        snapshot.forEach((d) => {
          list.push(normalizePurnaRegistration(d.id, d.data() as Record<string, unknown>));
        });
        list.sort((a, b) => (b.submittedAt?.seconds ?? 0) - (a.submittedAt?.seconds ?? 0));
        setPurnaApplications(list);
        setLoadingPurna(false);
      },
      (err) => {
        logFirestoreError(err, OperationType.LIST, 'purna_registrations');
        setLoadingPurna(false);
      }
    );

    const unsubPreRegistered = onSnapshot(
      query(collection(db, 'pre_registered')),
      (snapshot) => {
        const list: PreRegisteredMember[] = [];
        snapshot.forEach((d) => {
          list.push(normalizePreRegistered(d.id, d.data() as Record<string, unknown>));
        });
        setPreRegistered(list);
      },
      (err) => {
        logFirestoreError(err, OperationType.LIST, 'pre_registered');
      }
    );

    return () => {
      unsubUsers();
      unsubAttend();
      unsubQR();
      unsubPurna();
      unsubPreRegistered();
    };
  }, [todayStr, syncActiveCheckin, autoGenerateTodayQR]);

  useEffect(() => {
    if (!loadHistorical) return;

    const unsubAllAttend = onSnapshot(
      query(collection(db, 'attendance')),
      (snapshot) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AttendanceRecord);
        });
        setHistoricalAttendance(sortByTimestampDesc(list));
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, 'attendance');
      }
    );

    return () => unsubAllAttend();
  }, [loadHistorical]);

  const handleRotateQR = useCallback(async () => {
    await autoGenerateTodayQR();
  }, [autoGenerateTodayQR]);

  return {
    todayStr,
    users,
    attendanceToday,
    historicalAttendance,
    purnaApplications,
    preRegistered,
    activeQR,
    rulesError,
    loadingQR,
    loadingMembers,
    loadingPurna,
    handleRotateQR,
    enableHistoricalAttendance: () => setLoadHistorical(true),
  };
}
