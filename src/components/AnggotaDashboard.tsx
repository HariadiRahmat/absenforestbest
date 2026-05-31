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
import { getTodayStr } from '../lib/dateUtils';
import {
  Compass,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  History,
  User,
  LogOut,
  Edit2,
  Save,
  QrCode,
  Flame,
} from 'lucide-react';

export function AnggotaDashboard() {
  const { currentUser, userProfile, updateProfileDetails, logout } = useAuth();
  
  // States
  const [activeTab, setActiveTab] = useState<'absen' | 'riwayat' | 'profil'>('absen');
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanError, setScanError] = useState<FriendlyError | null>(null);
  
  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newName, setNewName] = useState(userProfile?.nama || '');
  const [newKelas, setNewKelas] = useState(userProfile?.kelas || '');
  const [newRegu, setNewRegu] = useState(userProfile?.regu || '');
  const [profileSaving, setProfileSaving] = useState(false);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newKelas.trim() || !newRegu.trim()) return;
    setProfileSaving(true);
    try {
      await updateProfileDetails(newName.trim(), newKelas.trim(), newRegu.trim());
      setIsEditingProfile(false);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
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
    <div id="scout-anggota-dashboard-wrapper" className="min-h-screen bg-bento-bg text-bento-text pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <header className="scout-card flex flex-row justify-between items-center px-6 py-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-bento-accent rounded-2xl flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-bento-dark" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-bento-muted">Halo,</p>
              <h1 className="text-xl font-bold text-bento-text">{userProfile?.nama}</h1>
              <p className="text-sm text-bento-muted mt-0.5">Regu {userProfile?.regu} · Kelas {userProfile?.kelas}</p>
            </div>
          </div>
          <button
            id="scout-btn-logout-header"
            onClick={logout}
            className="scout-btn-secondary text-xs py-2.5 px-4"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </header>

        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="scout-card p-5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-bento-accent flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-bento-dark" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-bento-muted tracking-wide">Streak Kehadiran</p>
              <p className="text-2xl font-bold text-bento-text mt-0.5">{streakCount} hari</p>
            </div>
          </div>
          <div className="scout-card p-5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-bento-highlight flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-bento-primary" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-bento-muted tracking-wide">Hari Ini</p>
              <p className="text-sm font-bold text-bento-text mt-0.5">{todayStr}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Interactive Scaffold */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        
        <div className="scout-card p-2 flex flex-wrap gap-1 mb-6">
          {([
            { id: 'tab-btn-absen', key: 'absen' as const, label: 'Absensi', icon: QrCode },
            { id: 'tab-btn-riwayat', key: 'riwayat' as const, label: 'Riwayat', icon: History },
            { id: 'tab-btn-profil', key: 'profil' as const, label: 'Profil', icon: User },
          ]).map(({ id, key, label, icon: Icon }) => (
            <button
              key={key}
              id={id}
              onClick={() => setActiveTab(key)}
              className={`scout-nav-pill flex-1 justify-center ${
                activeTab === key ? 'scout-nav-pill-active' : 'scout-nav-pill-inactive'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

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
            <div className="scout-card p-6">
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
                        className="flex items-center justify-between p-4 bg-bento-soft rounded-2xl border border-bento-border hover:bg-white transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-bento-accent flex items-center justify-center shrink-0">
                            <CheckCircle className="w-5 h-5 text-bento-dark" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-bento-text">{record.tanggal}</span>
                            <div className="flex items-center gap-1.5 text-xs text-bento-muted mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {checkTime} WIB
                              <span>·</span>
                              <MapPin className="w-3.5 h-3.5" />
                              {record.latitude ? 'GPS' : 'Tanpa GPS'}
                            </div>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-lime-100 text-lime-800 rounded-full text-[11px] font-semibold uppercase">
                          {record.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profil' && (
            <div className="scout-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-bento-primary" />
                <h3 className="font-sans text-base font-extrabold text-bento-text">Kelola Informasi Profil</h3>
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Nama Lengkap</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary rounded-2xl text-sm bg-bento-soft"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      disabled={profileSaving}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Kelas</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary rounded-2xl text-sm bg-bento-soft"
                        value={newKelas}
                        onChange={(e) => setNewKelas(e.target.value)}
                        disabled={profileSaving}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Regu</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary rounded-2xl text-sm bg-bento-soft"
                        value={newRegu}
                        onChange={(e) => setNewRegu(e.target.value)}
                        disabled={profileSaving}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      id="btn-cancel-edit-profile"
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      disabled={profileSaving}
                      className="flex-1 py-3 scout-btn-secondary text-sm"
                    >
                      Batal
                    </button>
                    <button
                      id="btn-save-edit-profile"
                      type="submit"
                      disabled={profileSaving}
                      className="flex-1 scout-btn-primary text-sm py-3"
                    >
                      {profileSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Simpan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 divide-y divide-slate-100">
                    <div className="py-3 flex justify-between text-xs">
                      <span className="text-slate-500 font-sans">Nama</span>
                      <span className="font-extrabold text-slate-800">{userProfile?.nama}</span>
                    </div>
                    <div className="py-3 flex justify-between text-xs">
                      <span className="text-slate-500 font-sans">Kelas</span>
                      <span className="font-extrabold text-slate-800">{userProfile?.kelas}</span>
                    </div>
                    <div className="py-3 flex justify-between text-xs">
                      <span className="text-slate-500 font-sans">Regu</span>
                      <span className="font-extrabold text-slate-800">{userProfile?.regu}</span>
                    </div>
                    <div className="py-3 flex justify-between text-xs">
                      <span className="text-slate-500 font-sans">Email</span>
                      <span className="font-mono text-slate-600">{userProfile?.email}</span>
                    </div>
                  </div>

                  <button
                    id="btn-start-edit-profile"
                    onClick={() => {
                      setNewName(userProfile?.nama || '');
                      setNewKelas(userProfile?.kelas || '');
                      setNewRegu(userProfile?.regu || '');
                      setIsEditingProfile(true);
                    }}
                    className="w-full scout-btn-secondary py-3.5 text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profil Saya
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
