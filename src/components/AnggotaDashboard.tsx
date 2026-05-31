/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, logFirestoreError } from '../lib/firebase';
import { sortByTimestampDesc } from '../lib/normalizeUserProfile';
import { collection, query, where, onSnapshot, setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { verifyActiveCheckin } from '../lib/activeCheckin';
import { verifyGeofence } from '../lib/geofence';
import { AttendanceRecord, AttendanceStatus, OperationType } from '../types';
import { QRScanner, AttendancePayload } from './QRScanner';
import { parseAttendanceError } from '../lib/attendanceErrors';
import type { FriendlyError } from './ui/Alert';
import { Alert } from './ui/Alert';
import { TabNav } from './ui/TabNav';
import { UpcomingEventsPanel } from './UpcomingEventsPanel';
import { MemberBiodataPanel } from './MemberBiodataPanel';
import { getTodayStr } from '../lib/dateUtils';
import {
  Shield,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  History,
  User,
  LogOut,
  QrCode,
  Flame,
} from 'lucide-react';

export function AnggotaDashboard() {
  const { currentUser, userProfile, updateMemberBiodata, logout } = useAuth();
  
  // States
  const [activeTab, setActiveTab] = useState<'absen' | 'riwayat' | 'profil'>('absen');
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanError, setScanError] = useState<FriendlyError | null>(null);

  const todayStr = getTodayStr();

  // Listen to Personal Attendance History
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: AttendanceRecord[] = [];
      let foundToday: AttendanceRecord | null = null;

      snapshot.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as AttendanceRecord;
        records.push(item);
        if (item.tanggal === todayStr) {
          foundToday = item;
        }
      });

      const sorted = sortByTimestampDesc(records);
      setHistory(sorted);
      setTodayRecord(foundToday);
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, 'attendance');
    });

    return () => unsubscribe();
  }, [currentUser, todayStr]);

  // Submit scan check-in
  const handleScanSuccess = async (payload: AttendancePayload) => {
    if (!currentUser || !userProfile) return;
    setCheckingIn(true);
    setScanError(null);

    try {
      const compositeId = `${payload.tanggal}_${currentUser.uid}`;
      const recordRef = doc(db, 'attendance', compositeId);

      const recordSnap = await getDoc(recordRef);
      if (recordSnap.exists()) {
        throw new Error('Anda sudah melakukan absensi hari ini.');
      }

      await verifyActiveCheckin(payload.tanggal, payload.qrToken);
      await verifyGeofence(payload.latitude, payload.longitude);

      const newRecord: AttendanceRecord = {
        userId: payload.userId,
        nama: payload.nama,
        tanggal: payload.tanggal,
        timestamp: serverTimestamp(),
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        status: AttendanceStatus.HADIR,
        qrToken: payload.qrToken,
      };

      await setDoc(recordRef, newRecord);
    } catch (err: unknown) {
      console.warn('Scan check-in registration failed:', err);
      setScanError(parseAttendanceError(err));
    } finally {
      setCheckingIn(false);
    }
  };

  // Calculate consecutive-day streak (ends today if attended, otherwise yesterday)
  const hadirDates = new Set(
    history.filter((item) => item.status === AttendanceStatus.HADIR).map((item) => item.tanggal)
  );
  let streakCount = 0;
  if (hadirDates.size > 0) {
    const cursor = new Date();
    if (!hadirDates.has(todayStr)) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (true) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (!hadirDates.has(key)) break;
      streakCount++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return (
    <div id="scout-anggota-dashboard-wrapper" className="min-h-screen bg-bento-bg text-bento-text pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-12">
      <div className="scout-page max-w-4xl pt-4 sm:pt-6">
        <header className="scout-card px-4 py-3.5 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-bento-accent rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-bento-dark" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-bento-muted">Halo,</p>
              <h1 className="text-base sm:text-xl font-bold text-bento-text truncate leading-tight">{userProfile?.nama}</h1>
              <p className="text-[11px] sm:text-sm text-bento-muted mt-0.5 truncate">
                Regu {userProfile?.regu} · Kelas {userProfile?.kelas}
              </p>
            </div>
            <button
              id="scout-btn-logout-header"
              onClick={logout}
              className="scout-btn-secondary shrink-0 text-xs py-2 px-3 sm:hidden"
              aria-label="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <button
            id="scout-btn-logout-header-desktop"
            onClick={logout}
            className="scout-btn-secondary hidden sm:inline-flex w-auto mt-4 text-xs py-2.5 px-4"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 mt-3 sm:mt-5">
          <div className="scout-card scout-stat-card">
            <div className="scout-stat-icon bg-bento-accent">
              <Flame className="w-4 h-4 text-bento-dark" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-bento-muted tracking-wide truncate">Streak</p>
              <p className="text-lg sm:text-2xl font-bold text-bento-text mt-0.5 leading-none">{streakCount} hari</p>
            </div>
          </div>
          <div className="scout-card scout-stat-card">
            <div className="scout-stat-icon bg-bento-highlight">
              <Calendar className="w-4 h-4 text-bento-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-bento-muted tracking-wide">Hari Ini</p>
              <p className="text-xs sm:text-sm font-bold text-bento-text mt-0.5 truncate">{todayStr}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-5">
          <UpcomingEventsPanel />
        </div>

        <div className="mt-5 sm:mt-6">
          <TabNav
            tabs={[
              { id: 'tab-btn-absen', key: 'absen', label: 'Absensi', icon: QrCode },
              { id: 'tab-btn-riwayat', key: 'riwayat', label: 'Riwayat', icon: History },
              { id: 'tab-btn-profil', key: 'profil', label: 'Profil', icon: User },
            ]}
            active={activeTab}
            onChange={setActiveTab}
            columns={3}
          />

        {/* Tab content cards container */}
        <div className="space-y-6">
          {/* TAB 1: ABSENSI SCANNING & TODAY STATUS */}
          {activeTab === 'absen' && (
            <div className="space-y-6">
              
              {/* Today's Presence Status Callout */}
              {todayRecord ? (
                <div id="status-today-confirmed" className="scout-card p-6 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-bento-accent rounded-[20px] flex items-center justify-center mb-4">
                    <CheckCircle className="w-9 h-9 text-bento-dark" />
                  </div>
                  <h3 className="text-lg font-bold text-bento-text">Sudah absen hari ini</h3>
                  <p className="text-sm text-bento-muted mt-1 max-w-xs leading-relaxed">
                    Kehadiran Anda sudah tercatat. Selamat mengikuti kegiatan pramuka!
                  </p>

                  <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-6 border-t border-bento-border">
                    <div className="text-center">
                      <p className="text-[11px] text-bento-muted uppercase font-semibold tracking-wide">Jam Masuk</p>
                      <p className="font-bold text-sm text-bento-text mt-1 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {todayRecord.timestamp?.seconds ? new Date(todayRecord.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour12: false }) : '--:--'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-bento-muted uppercase font-semibold tracking-wide">Lokasi</p>
                      <p className="font-bold text-sm text-bento-text mt-1 flex items-center justify-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {todayRecord.latitude ? (
                          <a
                            href={`https://maps.google.com/?q=${todayRecord.latitude},${todayRecord.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-bento-primary hover:underline"
                          >
                            GPS tercatat
                          </a>
                        ) : 'Tanpa GPS'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <QRScanner
                  onScanSuccess={handleScanSuccess}
                  userId={currentUser!.uid}
                  memberName={userProfile!.nama}
                  loading={checkingIn}
                  error={scanError}
                />
              )}

              <Alert
                variant="info"
                title="Panduan absensi"
                tips={[
                  'Scan QR yang aktif di dashboard Pembina hari ini.',
                  'Izinkan akses GPS — wajib jika geofence latihan aktif.',
                  'Satu absensi per hari per anggota.',
                ]}
              />
            </div>
          )}

          {/* TAB 2: RIWAYAT KEHADIRAN */}
          {activeTab === 'riwayat' && (
            <div className="scout-card p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <History className="w-5 h-5 text-bento-primary" />
                <h3 className="text-base font-bold text-bento-text">Riwayat Kehadiran</h3>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-bento-muted text-sm">
                  <Calendar className="w-12 h-12 stroke-1 mx-auto mb-2 opacity-40" />
                  Belum ada catatan kehadiran.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((record) => {
                    const checkTime = record.timestamp?.seconds
                      ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    return (
                      <div
                        key={record.id}
                        className="scout-member-card flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="scout-avatar bg-bento-accent text-bento-dark">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-bento-text block truncate">{record.tanggal}</span>
                            <div className="flex items-center gap-1.5 text-[11px] text-bento-muted mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" />
                              {checkTime}
                              <span>·</span>
                              <MapPin className="w-3 h-3 shrink-0" />
                              {record.latitude ? 'GPS' : 'Tanpa GPS'}
                            </div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-lime-50 text-lime-800 rounded-full text-[10px] font-semibold uppercase shrink-0 border border-lime-200">
                          {record.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profil' && userProfile && (
            <MemberBiodataPanel
              profile={userProfile}
              onSave={updateMemberBiodata}
              title="Biodata Anggota"
              subtitle="Data diri lengkap sesuai profil keanggotaan"
            />
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
