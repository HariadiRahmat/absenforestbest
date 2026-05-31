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
import { AttendanceRecord, AttendanceStatus, OperationType } from '../types';
import { QRScanner, AttendancePayload } from './QRScanner';
import { getAttendanceErrorMessage } from '../lib/attendanceErrors';
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
  Users,
  AlertTriangle,
  Flame,
  ChevronRight
} from 'lucide-react';

export function AnggotaDashboard() {
  const { currentUser, userProfile, updateProfileDetails, logout } = useAuth();
  
  // States
  const [activeTab, setActiveTab] = useState<'absen' | 'riwayat' | 'profil'>('absen');
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);
  
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
    setScanSuccess(false);

    try {
      const compositeId = `${payload.tanggal}_${currentUser.uid}`;
      const recordRef = doc(db, 'attendance', compositeId);

      const recordSnap = await getDoc(recordRef);
      if (recordSnap.exists()) {
        throw new Error('Anda sudah melakukan absensi hari ini.');
      }

      await verifyActiveCheckin(payload.tanggal, payload.qrToken);

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
      setScanSuccess(true);
    } catch (err: unknown) {
      console.warn('Scan check-in registration failed:', err);
      setScanError(getAttendanceErrorMessage(err));
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
      
      {/* Immersive Bento Page Header & Stats Row */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Top Header Card */}
        <header className="flex flex-row justify-between items-center bg-white px-8 py-6 rounded-[24px] shadow-sm border border-bento-border gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bento-primary rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
              <Compass className="w-5 h-5 text-bento-highlight animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider text-bento-muted font-mono uppercase">Anggota Aktif</span>
              <h1 className="text-lg font-extrabold tracking-tight font-sans text-bento-text">{userProfile?.nama}</h1>
              <p className="text-xs text-bento-muted font-sans mt-0.5">Regu {userProfile?.regu} • Kelas {userProfile?.kelas}</p>
            </div>
          </div>
          <button 
            id="scout-btn-logout-header"
            onClick={logout}
            className="py-2 px-4 bg-bento-soft hover:bg-bento-border/50 text-bento-text rounded-xl text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer border border-bento-border shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Keluar Sesi
          </button>
        </header>

        {/* Quick Streak Stats card */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-bento-highlight rounded-[24px] p-5 flex items-center gap-3.5 border border-bento-border-green shadow-sm">
            <div className="bg-white/50 w-10 h-10 rounded-full flex items-center justify-center border border-bento-border-green/20 shrink-0">
              <Flame className="w-5 h-5 text-bento-primary fill-bento-primary/30" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-bento-primary tracking-wider">Kehadiran Aktif</div>
              <div className="text-xl font-black text-bento-text mt-0.5">{streakCount} Kali</div>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-5 flex items-center gap-3.5 border border-bento-border shadow-sm">
            <div className="bg-bento-soft w-10 h-10 rounded-full flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-bento-muted" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-bento-muted tracking-wider">Tanggal Hari Ini</div>
              <div className="text-xs font-bold text-bento-text mt-0.5">{todayStr}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Interactive Scaffold */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        
        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-[20px] border border-bento-border flex gap-2 shadow-sm mb-6">
          <button
            id="tab-btn-absen"
            onClick={() => setActiveTab('absen')}
            className={`flex-1 py-3 text-xs font-bold font-sans rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'absen'
                ? 'bg-bento-primary text-white shadow-sm'
                : 'text-bento-muted hover:text-bento-text hover:bg-bento-soft/80'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Isi Absensi
          </button>
          <button
            id="tab-btn-riwayat"
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 py-3 text-xs font-bold font-sans rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'riwayat'
                ? 'bg-bento-primary text-white shadow-sm'
                : 'text-bento-muted hover:text-bento-text hover:bg-bento-soft/80'
            }`}
          >
            <History className="w-4 h-4" />
            Riwayat Pribadi
          </button>
          <button
            id="tab-btn-profil"
            onClick={() => setActiveTab('profil')}
            className={`flex-1 py-3 text-xs font-bold font-sans rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'profil'
                ? 'bg-bento-primary text-white shadow-sm'
                : 'text-bento-muted hover:text-bento-text hover:bg-bento-soft/80'
            }`}
          >
            <User className="w-4 h-4" />
            Ubah Profil
          </button>
        </div>

        {/* Tab content cards container */}
        <div className="space-y-6">
          {/* TAB 1: ABSENSI SCANNING & TODAY STATUS */}
          {activeTab === 'absen' && (
            <div className="space-y-6">
              
              {/* Today's Presence Status Callout */}
              {todayRecord ? (
                <div id="status-today-confirmed" className="bg-emerald-50 border-2 border-emerald-500/30 rounded-3xl p-6 text-center shadow-sm flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-9 h-9 text-emerald-600 animate-bounce" />
                  </div>
                  <h3 className="text-lg font-extrabold text-emerald-950 font-sans">
                    Absensi Terdaftar Hari Ini!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1 max-w-xs leading-normal">
                    Laporan kehadiran Anda sukses divalidasi pembina. Silakan ikuti kegiatan kepramukaan dengan penuh semangat!
                  </p>

                  <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-6 border-t border-emerald-200/50">
                    <div className="text-center">
                      <span className="text-[10px] text-emerald-700 uppercase font-mono font-bold tracking-wider">Jam Masuk</span>
                      <div className="font-sans font-bold text-sm text-emerald-900 mt-0.5 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {todayRecord.timestamp?.seconds ? new Date(todayRecord.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour12: false }) : '--:--'}
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-emerald-700 uppercase font-mono font-bold tracking-wider">Lokasi</span>
                      <div className="font-sans font-bold text-xs text-emerald-950 mt-0.5 flex items-center justify-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {todayRecord.latitude ? (
                          <a
                            href={`https://maps.google.com/?q=${todayRecord.latitude},${todayRecord.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-emerald-800 hover:text-emerald-900"
                          >
                            Terkunci (GPS)
                          </a>
                        ) : 'Tanpa GPS'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <QRScanner
                  onScanSuccess={handleScanSuccess}
                  userId={currentUser!.uid}
                  memberName={userProfile!.nama}
                  loading={checkingIn}
                  errorMsg={scanError}
                />
              )}

              {/* Attendance quick reminder instructions */}
              <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-2xl flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Peraturan Check-In</h4>
                  <ul className="text-[11px] text-amber-800 list-disc list-inside mt-1 space-y-1">
                    <li>QR Code yang discan harus milik Pembina yang aktif hari ini.</li>
                    <li>Sistem mendeteksi letak koordinat GPS Anda untuk divalidasi.</li>
                    <li>Satu anggota pramuka hanya diperbolehkan melakukan satu absensi per hari.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RIWAYAT KEHADIRAN */}
          {activeTab === 'riwayat' && (
            <div className="bg-white rounded-[32px] border border-bento-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-bento-primary" />
                <h3 className="font-sans text-base font-extrabold text-bento-text">Riwayat Check-In Pribadi</h3>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Calendar className="w-12 h-12 stroke-1 mx-auto mb-2 text-slate-300" />
                  Belum ada catatan kehadiran pramuka yang tersimpan.
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((record) => {
                    const checkTime = record.timestamp?.seconds
                      ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    return (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800">{record.tanggal}</span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3.5 h-3.5" />
                                {checkTime} WIB
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {record.latitude ? 'GPS' : 'Tanpa GPS'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold tracking-wider uppercase">
                          {record.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFIL & SETTING */}
          {activeTab === 'profil' && (
            <div className="bg-white rounded-[32px] border border-bento-border p-6 shadow-sm">
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
                      className="w-full px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent rounded-xl text-sm"
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
                        className="w-full px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent rounded-xl text-sm"
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
                        className="w-full px-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent rounded-xl text-sm"
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
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Batal
                    </button>
                    <button
                      id="btn-save-edit-profile"
                      type="submit"
                      disabled={profileSaving}
                      className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
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
                    className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex justify-center items-center gap-2 cursor-pointer"
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
