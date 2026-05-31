/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, logFirestoreError, handleFirestoreError } from '../lib/firebase';
import { normalizeUserProfile, sortByTimestampDesc } from '../lib/normalizeUserProfile';
import { getTodayStr } from '../lib/dateUtils';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { UserProfile, AttendanceRecord, QRCodeConfig, UserRole, UserStatus, AttendanceStatus, OperationType } from '../types';
import { QRGenerator } from './QRGenerator';
import { Alert } from './ui/Alert';
import {
  Users,
  QrCode,
  CheckCircle,
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  AlertCircle,
  Clock,
  MapPin,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  BarChart2
} from 'lucide-react';

function formatHeaderDate() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function AdminDashboard() {
  const todayStr = getTodayStr();

  // Navigation states
  const [adminTab, setAdminTab] = useState<'qr_monitor' | 'crud_anggota' | 'rekap'>('qr_monitor');

  // Core Firestore states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceRecord[]>([]);
  const [historicalAttendance, setHistoricalAttendance] = useState<AttendanceRecord[]>([]);
  const [activeQR, setActiveQR] = useState<QRCodeConfig | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);

  // Loading states
  const [loadingQR, setLoadingQR] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // CRUD member form states
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formSquad, setFormSquad] = useState('');
  const [formRole, setFormRole] = useState<UserRole>(UserRole.ANGGOTA);
  const [formStatus, setFormStatus] = useState<UserStatus>(UserStatus.AKTIF);
  const [formError, setFormError] = useState<string | null>(null);

  // Search/Filters states
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilterRegu, setMemberFilterRegu] = useState('ALL');
  const [memberFilterKelas, setMemberFilterKelas] = useState('ALL');

  // Setup listeners on mounts
  useEffect(() => {
    setLoadingMembers(true);
    // 1. Listen to all Scout Members
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const uList: UserProfile[] = [];
      snapshot.forEach((d) => {
        uList.push(normalizeUserProfile(d.id, d.data() as Record<string, unknown>));
      });
      uList.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setUsers(uList);
      setLoadingMembers(false);
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, 'users');
      setLoadingMembers(false);
    });

    const qAttendToday = query(
      collection(db, 'attendance'),
      where('tanggal', '==', todayStr)
    );
    const unsubAttend = onSnapshot(qAttendToday, (snapshot) => {
      const aList: AttendanceRecord[] = [];
      snapshot.forEach((d) => {
        aList.push({ id: d.id, ...d.data() } as AttendanceRecord);
      });
      setAttendanceToday(sortByTimestampDesc(aList));
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, 'attendance');
    });

    // 3. Listen to all QR code modifications of today
    const qrRef = doc(db, 'qr_codes', todayStr);
    const unsubQR = onSnapshot(qrRef, async (docSnap) => {
      if (docSnap.exists()) {
        const qrData = docSnap.data() as QRCodeConfig;
        setActiveQR(qrData);
        try {
          await syncActiveCheckin(qrData);
        } catch (err) {
          console.warn('Sync active_checkin failed:', err);
        }
      } else {
        // Automatically bootstrap today's QR code on Pembina dashboard open!
        await autoGenerateTodayQR();
      }
    }, (error) => {
      logFirestoreError(error, OperationType.GET, `qr_codes/${todayStr}`);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('permission') || msg.includes('Permission')) {
        setRulesError(
          'Firestore Rules belum di-publish. Buka Firebase Console → Firestore → Rules → salin file firestore.rules dari repo → Publish. Link: console.firebase.google.com/project/absenforestbest/firestore/rules'
        );
      }
    });

    const qAllAttend = query(collection(db, 'attendance'));
    const unsubAllAttend = onSnapshot(qAllAttend, (snapshot) => {
      const list: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AttendanceRecord);
      });
      setHistoricalAttendance(sortByTimestampDesc(list));
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, 'attendance');
    });

    return () => {
      unsubUsers();
      unsubAttend();
      unsubQR();
      unsubAllAttend();
    };
  }, [todayStr]);

  // Method to auto generate a dynamic QR
  const syncActiveCheckin = async (qr: QRCodeConfig) => {
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
  };

  const autoGenerateTodayQR = async () => {
    setLoadingQR(true);
    try {
      const randToken = 'SBT_' + Math.random().toString(36).substring(2, 10).toUpperCase() + '_' + Date.now().toString().slice(-4);
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
      console.error("Auto generate QR failed:", err);
    } finally {
      setLoadingQR(false);
    }
  };

  // Explicit user/admin rotate action
  const handleRotateQR = async () => {
    await autoGenerateTodayQR();
  };

  // CRUD ops
  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setSelectedMemberId(null);
    setFormName('');
    setFormEmail('');
    setFormClass('');
    setFormSquad('');
    setFormRole(UserRole.ANGGOTA);
    setFormStatus(UserStatus.AKTIF);
    setFormError(null);
    setShowMemberModal(true);
  };

  const handleOpenEditModal = (member: UserProfile) => {
    setIsEditMode(true);
    setSelectedMemberId(member.userId);
    setFormName(member.nama);
    setFormEmail(member.email);
    setFormClass(member.kelas);
    setFormSquad(member.regu);
    setFormRole(member.role);
    setFormStatus(member.status);
    setFormError(null);
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formClass.trim() || !formSquad.trim()) {
      setFormError('Semua input wajib diisi.');
      return;
    }

    // Basic email validation
    if (!formEmail.includes('@')) {
      setFormError('Format email tidak valid.');
      return;
    }

    try {
      const emailKey = formEmail.trim().toLowerCase();

      if (isEditMode && selectedMemberId) {
        const userRef = doc(db, 'users', selectedMemberId);
        const existingData = users.find((u) => u.userId === selectedMemberId);
        await setDoc(userRef, {
          userId: selectedMemberId,
          nama: formName.trim(),
          email: emailKey,
          kelas: formClass.trim(),
          regu: formSquad.trim(),
          status: formStatus,
          role: formRole,
          createdAt: existingData?.createdAt || serverTimestamp(),
        });
      } else {
        // Pre-register by email — profile migrates to users/{auth.uid} on first Google login
        await setDoc(doc(db, 'pre_registered', emailKey), {
          nama: formName.trim(),
          email: emailKey,
          kelas: formClass.trim(),
          regu: formSquad.trim(),
          status: formStatus,
          role: formRole,
          createdAt: serverTimestamp(),
        });
      }

      setShowMemberModal(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Gagal menyimpan profil anggota.');
    }
  };

  const handleDeleteMember = async (userId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data anggota pramuka ini?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus = user.status === UserStatus.AKTIF ? UserStatus.NON_AKTIF : UserStatus.AKTIF;
    try {
      await updateDoc(doc(db, 'users', user.userId), { status: nextStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.userId}`);
    }
  };

  // Calculations for dashboard counters
  const totalScoutsCount = users.filter(u => u.role === UserRole.ANGGOTA).length;
  const loggedTodayCount = attendanceToday.length;
  const missingTodayCount = Math.max(0, totalScoutsCount - loggedTodayCount);
  const attendanceRate = totalScoutsCount > 0 ? Math.round((loggedTodayCount / totalScoutsCount) * 100) : 0;

  // Filter lists
  const filteredMembers = users.filter((member) => {
    const search = memberSearch.toLowerCase();
    const nama = (member.nama ?? '').toLowerCase();
    const email = (member.email ?? '').toLowerCase();
    const kelas = (member.kelas ?? '').toLowerCase();
    const regu = (member.regu ?? '').toLowerCase();

    const matchesSearch =
      nama.includes(search) ||
      email.includes(search) ||
      kelas.includes(search) ||
      regu.includes(search);

    const matchesRegu = memberFilterRegu === 'ALL' || (member.regu ?? '').toUpperCase() === memberFilterRegu.toUpperCase();
    const matchesKelas = memberFilterKelas === 'ALL' || (member.kelas ?? '').toUpperCase() === memberFilterKelas.toUpperCase();

    return matchesSearch && matchesRegu && matchesKelas;
  });

  const uniqueRegus = Array.from(new Set(users.map((u) => (u.regu ?? '').toUpperCase()))).filter(Boolean);
  const uniqueClasses = Array.from(new Set(users.map((u) => (u.kelas ?? '').toUpperCase()))).filter(Boolean);

  // Grouped monthly chart coordinates mock stats
  const checkinsByDate: { [date: string]: number } = {};
  historicalAttendance.forEach(a => {
    checkinsByDate[a.tanggal] = (checkinsByDate[a.tanggal] || 0) + 1;
  });

  return (
    <div id="scout-admin-dashboard-container" className="min-h-screen bg-bento-bg text-bento-text pb-20">

      {rulesError && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <Alert
            variant="error"
            title="Firestore Rules belum aktif"
            message={rulesError}
            tips={['Buka Firebase Console → Firestore → Rules → Publish rules terbaru.']}
          />
          <a
            href="https://console.firebase.google.com/project/absenforestbest/firestore/rules"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 scout-btn-primary text-xs py-2.5 px-4"
          >
            Buka Firebase Rules
          </a>
        </div>
      )}
      
      {/* Immersive Bento Page Header & Stats Row */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        {/* Top Header Card */}
        <header className="scout-card flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-bento-accent rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-bento-dark" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-bento-muted">Control Panel</p>
              <h1 className="text-xl font-bold text-bento-text">Dashboard Pembina</h1>
              <p className="text-sm text-bento-muted mt-0.5">{formatHeaderDate()}</p>
            </div>
          </div>
          <button
            id="btn-scout-header-report"
            onClick={handleRotateQR}
            className="scout-btn-primary text-sm py-2.5 px-5 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Rotate Token
          </button>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="scout-card p-5 min-h-[110px]">
            <div className="w-8 h-8 rounded-xl bg-bento-accent flex items-center justify-center mb-3">
              <CheckCircle className="w-4 h-4 text-bento-dark" />
            </div>
            <p className="text-[11px] font-semibold uppercase text-bento-muted tracking-wide">Hadir Hari Ini</p>
            <h2 className="text-2xl font-bold mt-1 text-bento-text">
              {loggedTodayCount} <span className="text-sm font-medium text-bento-muted">/ {totalScoutsCount}</span>
            </h2>
          </div>

          <div className="scout-card p-5 min-h-[110px]">
            <div className="w-8 h-8 rounded-xl bg-bento-soft flex items-center justify-center mb-3">
              <HelpCircle className="w-4 h-4 text-bento-muted" />
            </div>
            <p className="text-[11px] font-semibold uppercase text-bento-muted tracking-wide">Belum Absen</p>
            <h2 className="text-2xl font-bold mt-1 text-bento-text">{missingTodayCount}</h2>
          </div>

          <div className="scout-card p-5 min-h-[110px]">
            <div className="w-8 h-8 rounded-xl bg-bento-highlight flex items-center justify-center mb-3">
              <Users className="w-4 h-4 text-bento-primary" />
            </div>
            <p className="text-[11px] font-semibold uppercase text-bento-muted tracking-wide">Total Anggota</p>
            <h2 className="text-2xl font-bold mt-1 text-bento-text">{totalScoutsCount}</h2>
          </div>

          <div className="scout-card p-5 min-h-[110px]">
            <div className="w-8 h-8 rounded-xl bg-bento-highlight flex items-center justify-center mb-3">
              <BarChart2 className="w-4 h-4 text-bento-primary" />
            </div>
            <p className="text-[11px] font-semibold uppercase text-bento-muted tracking-wide">Rasio Kehadiran</p>
            <h2 className="text-2xl font-bold mt-1 text-bento-text">{attendanceRate}%</h2>
          </div>
        </div>
      </div>

      {/* Main interactive directory navigation and contents panels */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        
        <div className="scout-card p-2 flex flex-wrap gap-1 mb-6">
          {([
            { id: 'admin-tab-qr', key: 'qr_monitor' as const, label: 'QR & Live', icon: QrCode },
            { id: 'admin-tab-crud', key: 'crud_anggota' as const, label: 'Anggota', icon: Users },
            { id: 'admin-tab-rekap', key: 'rekap' as const, label: 'Rekap', icon: FileSpreadsheet },
          ]).map(({ id, key, label, icon: Icon }) => (
            <button
              key={key}
              id={id}
              onClick={() => setAdminTab(key)}
              className={`scout-nav-pill flex-1 justify-center ${
                adminTab === key ? 'scout-nav-pill-active' : 'scout-nav-pill-inactive'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab contents panel layout */}
        <div className="space-y-6">
          
          {/* TAB 1: QR CODE SHIELD & REAL-TIME MONITOR */}
          {adminTab === 'qr_monitor' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Dynamic QR Generator box */}
              <div className="lg:col-span-1">
                <QRGenerator
                  token={activeQR?.token || null}
                  dateStr={todayStr}
                  onRotateToken={handleRotateQR}
                  loading={loadingQR}
                  isActive={activeQR?.active || false}
                />
              </div>

              {/* Real-time incoming attendance logger monitor */}
              <div className="lg:col-span-2 bg-white rounded-[32px] border border-bento-border p-6 shadow-sm flex flex-col min-h-[480px]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-bento-soft">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-bento-primary" />
                    <h3 className="font-sans text-sm font-extrabold text-bento-text">
                      Live Absensi Masuk ({attendanceToday.length})
                    </h3>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] text-bento-primary bg-bento-soft px-2.5 py-1 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 bg-bento-primary rounded-full animate-ping" />
                    REALTIME STREAMING ACTIVE
                  </span>
                </div>

                {attendanceToday.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 text-xs">
                    <Clock className="w-12 h-12 stroke-1 text-slate-300 mb-2 animate-pulse" />
                    Belum ada anggota pramuka yang check-in hari ini.<br />Tampilkan QR code di atas agar mereka bisa mulai memindai.
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto max-h-[420px] pr-2 space-y-3">
                    {attendanceToday.map((record) => {
                      const timeStr = record.timestamp?.seconds
                        ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour12: false })
                        : '--:--';
                      return (
                        <div
                          key={record.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-200/40 rounded-2xl hover:bg-slate-100/60 transition gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 font-bold shrink-0">
                              {record.nama?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-800">{record.nama}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Regu {users.find(u => u.userId === record.userId)?.regu || 'Anggota'} • Kelas {users.find(u => u.userId === record.userId)?.kelas || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Diterima</div>
                              <div className="font-sans text-xs font-bold text-slate-600 font-mono mt-0.5 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {timeStr} WIB
                              </div>
                            </div>

                            {/* GPS locator coordinates link */}
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Lokasi Geospasial</div>
                              <div className="mt-0.5 text-[11px] font-sans">
                                {record.latitude ? (
                                  <a
                                    id={`map-link-${record.id}`}
                                    href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    Buka Peta GPS
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic">Tanpa Koordinat</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE SCOUTS DIRECTORY (CRUD) */}
          {adminTab === 'crud_anggota' && (
            <div className="bg-white rounded-[32px] border border-bento-border p-6 shadow-sm">
              
              {/* Toolbar & filters row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Search className="h-4.5 w-4.5 text-bento-muted" />
                  </span>
                  <input
                    id="member-search-bar"
                    type="text"
                    className="w-full pl-10 pr-4 py-3 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary focus:border-transparent rounded-xl text-xs font-sans text-bento-text placeholder-bento-muted bg-bento-soft/20"
                    placeholder="Cari nama, email, kelas, regu..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id="filter-member-regu"
                    className="px-3 py-2.5 border border-bento-border rounded-xl text-xs font-bold bg-bento-soft select-none text-bento-text"
                    value={memberFilterRegu}
                    onChange={(e) => setMemberFilterRegu(e.target.value)}
                  >
                    <option value="ALL">Semua Regu</option>
                    {uniqueRegus.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>

                  <select
                    id="filter-member-kelas"
                    className="px-3 py-2.5 border border-bento-border rounded-xl text-xs font-bold bg-bento-soft select-none text-bento-text"
                    value={memberFilterKelas}
                    onChange={(e) => setMemberFilterKelas(e.target.value)}
                  >
                    <option value="ALL">Semua Kelas</option>
                    {uniqueClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <button
                    id="btn-add-scout-member"
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2.5 bg-bento-primary hover:bg-bento-primary-hover text-white rounded-xl text-xs font-bold font-sans shadow-sm flex items-center gap-1 cursor-pointer active:scale-97 border border-bento-primary"
                  >
                    <Plus className="w-4 h-4 text-bento-highlight" />
                    Tambah Anggota
                  </button>
                </div>
              </div>

              {/* Table list of members */}
              {loadingMembers ? (
                <div className="text-center py-12 text-slate-500 font-sans text-xs">
                  <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Memuat data scout...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Users className="w-12 h-12 stroke-1 mx-auto mb-2 text-slate-300" />
                  Tidak ditemukan data scout yang cocok dengan pencarian / filter Anda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-4 rounded-l-2xl">Nama & Email</th>
                        <th className="p-4">Kelas / Regu</th>
                        <th className="p-4">Jenis Peran</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right rounded-r-2xl">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredMembers.map((member) => (
                        <tr key={member.userId} className="hover:bg-slate-50/50 transition duration-150">
                          <td className="p-4">
                            <div className="font-extrabold text-slate-800">{member.nama}</div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5">{member.email}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-slate-700">Kelas {member.kelas}</div>
                            <div className="text-slate-500 mt-0.5">Regu {member.regu}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                              member.role === UserRole.ADMIN
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-250'
                            }`}>
                              {member.role === UserRole.ADMIN ? 'Pembina' : 'Anggota'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              id={`toggle-status-${member.userId}`}
                              onClick={() => handleToggleStatus(member)}
                              className="font-sans font-bold cursor-pointer inline-flex items-center gap-1 active:scale-95 text-[10px]"
                              title="Klik untuk mengubah status"
                            >
                              {member.status === UserStatus.AKTIF ? (
                                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                  Aktif
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                                  Nonaktif
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              id={`edit-member-${member.userId}`}
                              onClick={() => handleOpenEditModal(member)}
                              className="p-1.5 hover:bg-emerald-50 text-emerald-800 transition rounded-lg bg-slate-50 border border-slate-200/55 cursor-pointer"
                              title="Ubah Anggota"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-member-${member.userId}`}
                              onClick={() => handleDeleteMember(member.userId)}
                              className="p-1.5 hover:bg-red-50 text-red-700 transition rounded-lg bg-slate-50 border border-slate-200/55 cursor-pointer"
                              title="Hapus Anggota"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STATS & HISTORICAL LOGS (REKAP) */}
          {adminTab === 'rekap' && (
            <div className="bg-white rounded-[32px] border border-bento-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 pb-2 border-b border-bento-soft">
                <BarChart2 className="w-5 h-5 text-bento-primary" />
                <h3 className="font-sans text-base font-extrabold text-bento-text">
                  Rekap Partisipasi & Statistik Absensi
                </h3>
              </div>

              {historicalAttendance.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <FileSpreadsheet className="w-12 h-12 stroke-1 mx-auto mb-2 text-slate-300" />
                  Belum ada sejarah log absensi pramuka yang terekam.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Presence summary per date */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 tracking-wider mb-3 uppercase">Statistik Partisipasi harian</h4>
                    <div className="space-y-3">
                      {Object.keys(checkinsByDate).sort().reverse().slice(0, 10).map((date) => {
                        const count = checkinsByDate[date];
                        const countPercentage = totalScoutsCount > 0 ? Math.round((count / totalScoutsCount) * 100) : 0;
                        return (
                          <div key={date} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-extrabold text-slate-700">{date}</span>
                              <span className="font-bold text-emerald-950 font-mono">{count} / {totalScoutsCount} Anggota ({countPercentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${Math.min(100, countPercentage)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Complete Historical Log Table */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-extrabold text-slate-800 tracking-wider mb-3 uppercase">Daftar Audit Log Absensi Lengkap</h4>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">Nama</th>
                            <th className="p-3">Waktu scan</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-right">Lokasi GPS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                          {historicalAttendance.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-semibold">{log.tanggal}</td>
                              <td className="p-3 font-bold text-slate-800">{log.nama}</td>
                              <td className="p-3 font-mono">
                                {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour12: false }) : '--:--'}
                              </td>
                              <td className="p-3 text-center">
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                  {log.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                {log.latitude ? (
                                  <a
                                    id={`rekap-map-link-${log.id}`}
                                    href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-700 font-bold underline cursor-pointer"
                                  >
                                    Lihat Koordinat
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic">Tanpa GPS</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CRUD MODAL FOR MEMBER CREATION / CORRECTION */}
      {showMemberModal && (
        <div id="scout-member-modal-overlay" className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-emerald-50 text-left shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-sans text-base font-extrabold text-slate-800">
                {isEditMode ? 'Ubah Data Anggota Pramuka' : 'Pre-Register Anggota Baru'}
              </h3>
              <button
                id="btn-close-member-modal"
                onClick={() => setShowMemberModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs font-semibold">
                  ⚠️ {formError}
                </div>
              )}

              {!isEditMode && (
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  Profil akan otomatis terhubung saat anggota login dengan email Google yang sama.
                </p>
              )}

              {/* Name field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Nama Lengkap</label>
                <input
                  id="form-scout-name"
                  type="text"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  placeholder="Contoh: Farhan Sanjaya"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              {/* Email field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Alamat Email (Digunakan Login Google)</label>
                <input
                  id="form-scout-email"
                  type="email"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  placeholder="Contoh: farhan@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* School Class */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Kelas</label>
                  <input
                    id="form-scout-class"
                    type="text"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="Contoh: X.4 / XII IPS"
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    required
                  />
                </div>

                {/* Squad/Regu */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Regu Pramuka</label>
                  <input
                    id="form-scout-squad"
                    type="text"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="Contoh: Garuda / Orchid"
                    value={formSquad}
                    onChange={(e) => setFormSquad(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* System Role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Hak Akses</label>
                  <select
                    id="form-scout-role"
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-xs font-bold font-sans bg-slate-50 select-none text-slate-700"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                  >
                    <option value={UserRole.ANGGOTA}>Anggota Pramuka</option>
                    <option value={UserRole.ADMIN}>Pembina (Admin)</option>
                  </select>
                </div>

                {/* Membership Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status Anggota</label>
                  <select
                    id="form-scout-status"
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-xs font-bold font-sans bg-slate-50 select-none text-slate-700"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                  >
                    <option value={UserStatus.AKTIF}>Aktif</option>
                    <option value={UserStatus.NON_AKTIF}>Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Action row */}
              <div className="flex gap-2 pt-4">
                <button
                  id="btn-cancel-scout-form"
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 py-3 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold font-sans border border-slate-250 transition"
                >
                  Batal
                </button>
                <button
                  id="btn-save-scout-form"
                  type="submit"
                  className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs font-sans transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-97 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  {isEditMode ? 'Simpan Data' : 'Simpan Pre-Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
