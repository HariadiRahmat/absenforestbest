/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
import { GeofenceSettings } from './GeofenceSettings';
import { PurnaLinksSettings } from './PurnaLinksSettings';
import { MemberDirectory } from './MemberDirectory';
import { Alert } from './ui/Alert';
import { TabNav } from './ui/TabNav';
import {
  Users,
  QrCode,
  CheckCircle,
  HelpCircle,
  Check,
  X,
  AlertCircle,
  Clock,
  MapPin,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  BarChart2,
  Shield,
  Award,
  Link2,
} from 'lucide-react';

function formatHeaderDate(short = false) {
  if (short) {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function filterUsersByRole(
  users: UserProfile[],
  role: UserRole,
  search: string,
  reguFilter: string,
  kelasFilter: string,
  applyClassSquadFilters: boolean
) {
  const q = search.toLowerCase();
  return users.filter((member) => {
    if (member.role !== role) return false;

    const nama = (member.nama ?? '').toLowerCase();
    const email = (member.email ?? '').toLowerCase();
    const kelas = (member.kelas ?? '').toLowerCase();
    const regu = (member.regu ?? '').toLowerCase();

    const matchesSearch =
      nama.includes(q) || email.includes(q) || kelas.includes(q) || regu.includes(q);

    if (!applyClassSquadFilters) return matchesSearch;

    const matchesRegu =
      reguFilter === 'ALL' || (member.regu ?? '').toUpperCase() === reguFilter.toUpperCase();
    const matchesKelas =
      kelasFilter === 'ALL' || (member.kelas ?? '').toUpperCase() === kelasFilter.toUpperCase();

    return matchesSearch && matchesRegu && matchesKelas;
  });
}

export function AdminDashboard() {
  const { userProfile } = useAuth();
  const todayStr = getTodayStr();

  // Navigation states
  const [adminTab, setAdminTab] = useState<
    'qr_monitor' | 'crud_anggota' | 'crud_pembina' | 'crud_purna' | 'purna_docs' | 'rekap' | 'geofence'
  >('qr_monitor');

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
  const [memberSearchAnggota, setMemberSearchAnggota] = useState('');
  const [memberSearchPembina, setMemberSearchPembina] = useState('');
  const [memberSearchPurna, setMemberSearchPurna] = useState('');
  const [memberFilterRegu, setMemberFilterRegu] = useState('ALL');
  const [memberFilterKelas, setMemberFilterKelas] = useState('ALL');
  const [formContextRole, setFormContextRole] = useState<UserRole>(UserRole.ANGGOTA);

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
  const handleOpenCreateModal = (role: UserRole) => {
    setIsEditMode(false);
    setSelectedMemberId(null);
    setFormName('');
    setFormEmail('');
    setFormClass(role === UserRole.ADMIN ? 'Pembina' : role === UserRole.PURNA ? 'Purna' : '');
    setFormSquad(role === UserRole.ADMIN ? 'Staf' : role === UserRole.PURNA ? 'Alumni' : '');
    setFormRole(role);
    setFormContextRole(role);
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
    setFormContextRole(member.role);
    setFormStatus(member.status);
    setFormError(null);
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Format email tidak valid.');
      return;
    }

    const isPurnaCreate = !isEditMode && formContextRole === UserRole.PURNA;
    const resolvedName = formName.trim() || formEmail.trim().split('@')[0];
    const resolvedClass = formClass.trim() || (formContextRole === UserRole.PURNA ? 'Purna' : '');
    const resolvedSquad = formSquad.trim() || (formContextRole === UserRole.PURNA ? 'Alumni' : '');

    if (!isPurnaCreate && (!resolvedName || !resolvedClass || !resolvedSquad)) {
      setFormError('Semua input wajib diisi.');
      return;
    }

    try {
      const emailKey = formEmail.trim().toLowerCase();

      if (isEditMode && selectedMemberId) {
        const userRef = doc(db, 'users', selectedMemberId);
        const existingData = users.find((u) => u.userId === selectedMemberId);
        await setDoc(userRef, {
          ...existingData,
          userId: selectedMemberId,
          nama: resolvedName,
          email: emailKey,
          kelas: resolvedClass,
          regu: resolvedSquad,
          status: formStatus,
          role: formRole,
          createdAt: existingData?.createdAt || serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'pre_registered', emailKey), {
          nama: resolvedName,
          email: emailKey,
          kelas: resolvedClass,
          regu: resolvedSquad,
          status: formStatus,
          role: formRole,
          createdAt: serverTimestamp(),
        });
      }

      setShowMemberModal(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Gagal menyimpan data.');
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
  const totalPembinaCount = users.filter((u) => u.role === UserRole.ADMIN).length;
  const totalScoutsCount = users.filter((u) => u.role === UserRole.ANGGOTA).length;
  const loggedTodayCount = attendanceToday.length;
  const missingTodayCount = Math.max(0, totalScoutsCount - loggedTodayCount);
  const attendanceRate = totalScoutsCount > 0 ? Math.round((loggedTodayCount / totalScoutsCount) * 100) : 0;

  const filteredAnggota = filterUsersByRole(
    users,
    UserRole.ANGGOTA,
    memberSearchAnggota,
    memberFilterRegu,
    memberFilterKelas,
    true
  );

  const filteredPembina = filterUsersByRole(
    users,
    UserRole.ADMIN,
    memberSearchPembina,
    'ALL',
    'ALL',
    false
  );

  const filteredPurna = filterUsersByRole(
    users,
    UserRole.PURNA,
    memberSearchPurna,
    'ALL',
    'ALL',
    false
  );

  const anggotaUsers = users.filter((u) => u.role === UserRole.ANGGOTA);
  const uniqueRegus = Array.from(new Set(anggotaUsers.map((u) => (u.regu ?? '').toUpperCase()))).filter(Boolean);
  const uniqueClasses = Array.from(new Set(anggotaUsers.map((u) => (u.kelas ?? '').toUpperCase()))).filter(Boolean);

  // Grouped monthly chart coordinates mock stats
  const checkinsByDate: { [date: string]: number } = {};
  historicalAttendance.forEach(a => {
    checkinsByDate[a.tanggal] = (checkinsByDate[a.tanggal] || 0) + 1;
  });

  return (
    <div id="scout-admin-dashboard-container" className="min-h-screen bg-bento-bg text-bento-text pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-12">

      {rulesError && (
        <div className="scout-page pt-4">
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
      
      <div className="scout-page max-w-6xl pt-4 sm:pt-6">
        <header className="scout-card px-4 py-3.5 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-bento-accent rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-bento-dark" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-bento-muted">Control Panel</p>
              <h1 className="text-base sm:text-xl font-bold text-bento-text truncate leading-tight">{userProfile?.nama || 'Pembina'}</h1>
              <p className="text-[11px] sm:text-sm text-bento-muted mt-0.5 truncate">
                <span className="sm:hidden">{formatHeaderDate(true)}</span>
                <span className="hidden sm:inline">{formatHeaderDate()}</span>
              </p>
            </div>
            <button
              id="btn-scout-header-report"
              onClick={handleRotateQR}
              className="scout-btn-primary shrink-0 text-xs sm:text-sm py-2 px-3 sm:px-5 sm:hidden"
              aria-label="Rotate Token"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
          <button
            id="btn-scout-header-report-desktop"
            onClick={handleRotateQR}
            className="scout-btn-primary hidden sm:inline-flex w-auto mt-4 text-sm py-2.5 px-5"
          >
            <Sparkles className="w-4 h-4" />
            Rotate Token
          </button>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-3 sm:mt-5">
          <div className="scout-card scout-stat-card sm:min-h-[110px]">
            <div className="scout-stat-icon bg-bento-accent">
              <CheckCircle className="w-4 h-4 text-bento-dark" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-bento-muted tracking-wide truncate">Hadir</p>
              <h2 className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-bento-text leading-none">
                {loggedTodayCount} <span className="text-[11px] sm:text-sm font-medium text-bento-muted">/ {totalScoutsCount}</span>
              </h2>
            </div>
          </div>

          <div className="scout-card scout-stat-card sm:min-h-[110px]">
            <div className="scout-stat-icon bg-bento-soft">
              <HelpCircle className="w-4 h-4 text-bento-muted" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-bento-muted tracking-wide">Belum Absen</p>
              <h2 className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-bento-text leading-none">{missingTodayCount}</h2>
            </div>
          </div>

          <div className="scout-card scout-stat-card sm:min-h-[110px]">
            <div className="scout-stat-icon bg-bento-highlight">
              <Users className="w-4 h-4 text-bento-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-bento-muted tracking-wide">Anggota</p>
              <h2 className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-bento-text leading-none">{totalScoutsCount}</h2>
            </div>
          </div>

          <div className="scout-card scout-stat-card sm:min-h-[110px]">
            <div className="scout-stat-icon bg-bento-accent">
              <Shield className="w-4 h-4 text-bento-dark" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-bento-muted tracking-wide">Pembina</p>
              <h2 className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-bento-text leading-none">{totalPembinaCount}</h2>
            </div>
          </div>
        </div>

        <div className="mt-5 sm:mt-6">
          <TabNav
            tabs={[
              { id: 'admin-tab-qr', key: 'qr_monitor', label: 'QR & Live', icon: QrCode },
              { id: 'admin-tab-crud', key: 'crud_anggota', label: 'Anggota', icon: Users },
              { id: 'admin-tab-pembina', key: 'crud_pembina', label: 'Pembina', icon: Shield },
              { id: 'admin-tab-purna', key: 'crud_purna', label: 'Purna', icon: Award },
              { id: 'admin-tab-purna-docs', key: 'purna_docs', label: 'Link Purna', icon: Link2 },
              { id: 'admin-tab-rekap', key: 'rekap', label: 'Rekap', icon: FileSpreadsheet },
              { id: 'admin-tab-geofence', key: 'geofence', label: 'GPS', icon: MapPin },
            ]}
            active={adminTab}
            onChange={setAdminTab}
            columns={5}
          />

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
              <div className="lg:col-span-2 scout-card p-4 sm:p-6 flex flex-col min-h-[320px] sm:min-h-[480px]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-bento-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-5 h-5 text-bento-primary shrink-0" />
                    <h3 className="text-sm font-bold text-bento-text truncate">
                      Live Absensi ({attendanceToday.length})
                    </h3>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] text-bento-primary bg-bento-highlight px-2 py-1 rounded-full font-semibold shrink-0">
                    <span className="w-1.5 h-1.5 bg-bento-primary rounded-full animate-pulse" />
                    LIVE
                  </span>
                </div>

                {attendanceToday.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-bento-muted text-xs px-4">
                    <Clock className="w-10 h-10 stroke-1 text-bento-border mb-3" />
                    <p className="leading-relaxed max-w-xs">
                      Belum ada anggota yang check-in hari ini. Tampilkan QR code agar mereka bisa mulai memindai.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto max-h-[420px] space-y-2.5">
                    {attendanceToday.map((record) => {
                      const timeStr = record.timestamp?.seconds
                        ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour12: false })
                        : '--:--';
                      const memberInfo = users.find(u => u.userId === record.userId);
                      return (
                        <div key={record.id} className="scout-feed-item">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-bento-accent text-bento-dark flex items-center justify-center font-bold text-sm shrink-0">
                              {record.nama?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-bento-text truncate">{record.nama}</h4>
                              <p className="text-[11px] text-bento-muted mt-0.5 truncate">
                                Regu {memberInfo?.regu || '—'} · Kelas {memberInfo?.kelas || '—'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-[52px] sm:pl-0">
                            <div className="text-left sm:text-right">
                              <div className="text-[10px] font-semibold text-bento-muted uppercase">Waktu</div>
                              <div className="text-xs font-semibold text-bento-text mt-0.5 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-bento-muted" />
                                {timeStr}
                              </div>
                            </div>
                            <div className="text-right">
                              {record.latitude ? (
                                <a
                                  id={`map-link-${record.id}`}
                                  href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-bento-primary"
                                >
                                  <MapPin className="w-3.5 h-3.5" />
                                  GPS
                                </a>
                              ) : (
                                <span className="text-[11px] text-bento-muted">Tanpa GPS</span>
                              )}
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

          {adminTab === 'crud_anggota' && (
            <MemberDirectory
              role={UserRole.ANGGOTA}
              members={filteredAnggota}
              loading={loadingMembers}
              search={memberSearchAnggota}
              onSearchChange={setMemberSearchAnggota}
              filterRegu={memberFilterRegu}
              onFilterReguChange={setMemberFilterRegu}
              filterKelas={memberFilterKelas}
              onFilterKelasChange={setMemberFilterKelas}
              uniqueRegus={uniqueRegus}
              uniqueClasses={uniqueClasses}
              onAdd={() => handleOpenCreateModal(UserRole.ANGGOTA)}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteMember}
              onToggleStatus={handleToggleStatus}
            />
          )}

          {adminTab === 'crud_pembina' && (
            <MemberDirectory
              role={UserRole.ADMIN}
              members={filteredPembina}
              loading={loadingMembers}
              search={memberSearchPembina}
              onSearchChange={setMemberSearchPembina}
              filterRegu="ALL"
              onFilterReguChange={() => {}}
              filterKelas="ALL"
              onFilterKelasChange={() => {}}
              uniqueRegus={[]}
              uniqueClasses={[]}
              onAdd={() => handleOpenCreateModal(UserRole.ADMIN)}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteMember}
              onToggleStatus={handleToggleStatus}
            />
          )}

          {adminTab === 'crud_purna' && (
            <MemberDirectory
              role={UserRole.PURNA}
              members={filteredPurna}
              loading={loadingMembers}
              search={memberSearchPurna}
              onSearchChange={setMemberSearchPurna}
              filterRegu="ALL"
              onFilterReguChange={() => {}}
              filterKelas="ALL"
              onFilterKelasChange={() => {}}
              uniqueRegus={[]}
              uniqueClasses={[]}
              onAdd={() => handleOpenCreateModal(UserRole.PURNA)}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteMember}
              onToggleStatus={handleToggleStatus}
            />
          )}

          {adminTab === 'purna_docs' && <PurnaLinksSettings />}

          {/* TAB 3: STATS & HISTORICAL LOGS (REKAP) */}
          {adminTab === 'rekap' && (
            <div className="scout-card p-4 sm:p-6">
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
                          <div key={date} className="p-4 bg-bento-soft border border-bento-border rounded-2xl">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs mb-1.5">
                              <span className="font-bold text-bento-text">{date}</span>
                              <span className="font-semibold text-bento-muted font-mono text-[11px] sm:text-xs">
                                {count} / {totalScoutsCount} ({countPercentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-bento-border h-1.5 rounded-full overflow-hidden">
                              <div className="bg-bento-primary h-full rounded-full transition-all" style={{ width: `${Math.min(100, countPercentage)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Complete Historical Log — mobile cards + desktop table */}
                  <div className="pt-4 border-t border-bento-border">
                    <h4 className="text-xs font-bold text-bento-text tracking-wider mb-3 uppercase">Log Absensi Lengkap</h4>

                    <div className="md:hidden space-y-2.5 max-h-[360px] overflow-y-auto">
                      {historicalAttendance.map((log) => (
                        <div key={log.id} className="scout-member-card">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-bento-text truncate">{log.nama}</p>
                              <p className="text-[11px] text-bento-muted mt-0.5">{log.tanggal}</p>
                            </div>
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-lime-50 text-lime-800 border border-lime-200 shrink-0">
                              {log.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-bento-border text-[11px]">
                            <span className="text-bento-muted flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour12: false }) : '--:--'}
                            </span>
                            {log.latitude ? (
                              <a
                                id={`rekap-map-link-${log.id}`}
                                href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-bento-primary font-semibold flex items-center gap-1"
                              >
                                <MapPin className="w-3 h-3" />
                                GPS
                              </a>
                            ) : (
                              <span className="text-bento-muted">Tanpa GPS</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto max-h-[350px] overflow-y-auto">
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

          {adminTab === 'geofence' && <GeofenceSettings />}
        </div>
        </div>
      </div>

      {/* CRUD MODAL FOR MEMBER CREATION / CORRECTION */}
      {showMemberModal && (
        <div id="scout-member-modal-overlay" className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-bento-border text-left max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-sans text-base font-extrabold text-bento-text">
                {isEditMode
                  ? formContextRole === UserRole.ADMIN
                    ? 'Ubah Data Pembina'
                    : formContextRole === UserRole.PURNA
                      ? 'Ubah Data Purna'
                      : 'Ubah Data Anggota'
                  : formContextRole === UserRole.ADMIN
                    ? 'Pre-Register Pembina Baru'
                    : formContextRole === UserRole.PURNA
                      ? 'Pre-Register Purna Baru'
                      : 'Pre-Register Anggota Baru'}
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
                <p className="text-[11px] text-bento-muted bg-bento-soft border border-bento-border rounded-xl p-3">
                  {formContextRole === UserRole.ADMIN
                    ? 'Pembina akan otomatis terhubung saat login dengan email Google yang sama.'
                    : formContextRole === UserRole.PURNA
                      ? 'Purna cukup didaftarkan dengan email. Setelah login, mereka melengkapi biodata dan mengakses link dokumentasi.'
                      : 'Anggota akan otomatis terhubung saat login dengan email Google yang sama.'}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Alamat Email (Login Google)
                </label>
                <input
                  id="form-scout-email"
                  type="email"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  placeholder="Contoh: purna@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  disabled={isEditMode}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Nama Lengkap{formContextRole === UserRole.PURNA && !isEditMode ? ' (opsional)' : ''}
                </label>
                <input
                  id="form-scout-name"
                  type="text"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  placeholder={formContextRole === UserRole.PURNA ? 'Bisa dilengkapi saat login' : 'Contoh: Farhan Sanjaya'}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required={formContextRole !== UserRole.PURNA || isEditMode}
                />
              </div>

              {formContextRole !== UserRole.PURNA && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-bento-muted uppercase tracking-wider">
                    {formContextRole === UserRole.ADMIN ? 'Unit / Jabatan' : 'Kelas'}
                  </label>
                  <input
                    id="form-scout-class"
                    type="text"
                    className="w-full px-4 py-3 border border-bento-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
                    placeholder={formContextRole === UserRole.ADMIN ? 'Contoh: Pembina' : 'Contoh: X.4 / XII IPS'}
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-bento-muted uppercase tracking-wider">
                    {formContextRole === UserRole.ADMIN ? 'Bagian' : 'Regu Pramuka'}
                  </label>
                  <input
                    id="form-scout-squad"
                    type="text"
                    className="w-full px-4 py-3 border border-bento-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
                    placeholder={formContextRole === UserRole.ADMIN ? 'Contoh: Staf' : 'Contoh: Garuda / Orchid'}
                    value={formSquad}
                    onChange={(e) => setFormSquad(e.target.value)}
                    required
                  />
                </div>
              </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-bento-muted uppercase tracking-wider">Status</label>
                <select
                  id="form-scout-status"
                  className="w-full px-3 py-3 border border-bento-border rounded-xl text-xs font-semibold bg-bento-soft text-bento-text"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                >
                  <option value={UserStatus.AKTIF}>Aktif</option>
                  <option value={UserStatus.NON_AKTIF}>Nonaktif</option>
                </select>
              </div>

              <input type="hidden" value={formRole} readOnly />

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
