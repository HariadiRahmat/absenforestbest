/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdminData } from '../hooks/useAdminData';
import { Alert } from './ui/Alert';
import { AdminPageNav, AdminPage } from './admin/AdminPageNav';
import { AdminOverviewPage } from './admin/AdminOverviewPage';
import { AdminAbsensiPage, AdminAbsensiTab } from './admin/AdminAbsensiPage';
import { AdminKelolaPage, AdminKelolaTab } from './admin/AdminKelolaPage';
import { UserRole } from '../types';

export function AdminDashboard() {
  const { userProfile } = useAuth();
  const {
    todayStr,
    users,
    attendanceToday,
    historicalAttendance,
    purnaApplications,
    activeQR,
    rulesError,
    loadingQR,
    loadingMembers,
    loadingPurna,
    handleRotateQR,
    enableHistoricalAttendance,
  } = useAdminData();

  const [adminPage, setAdminPage] = useState<AdminPage>('overview');
  const [absensiTab, setAbsensiTab] = useState<AdminAbsensiTab>('qr_monitor');
  const [kelolaTab, setKelolaTab] = useState<AdminKelolaTab>('crud_anggota');

  const totalScoutsCount = users.filter((u) => u.role === UserRole.ANGGOTA).length;

  return (
    <div
      id="scout-admin-dashboard-container"
      className="min-h-screen bg-bento-bg text-bento-text pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-12"
    >
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
        <AdminPageNav active={adminPage} onChange={setAdminPage} />

        {adminPage === 'overview' && (
          <AdminOverviewPage
            userName={userProfile?.nama || 'Pembina'}
            users={users}
            attendanceToday={attendanceToday}
            purnaApplications={purnaApplications}
            loadingPurna={loadingPurna}
            onNavigateAbsensi={() => setAdminPage('absensi')}
            onNavigateKelolaPurna={() => {
              setAdminPage('kelola');
              setKelolaTab('crud_purna');
            }}
          />
        )}

        {adminPage === 'absensi' && (
          <AdminAbsensiPage
            tab={absensiTab}
            onTabChange={setAbsensiTab}
            todayStr={todayStr}
            activeQR={activeQR}
            loadingQR={loadingQR}
            attendanceToday={attendanceToday}
            historicalAttendance={historicalAttendance}
            users={users}
            totalScoutsCount={totalScoutsCount}
            onRotateQR={handleRotateQR}
            onEnableHistorical={enableHistoricalAttendance}
          />
        )}

        {adminPage === 'kelola' && (
          <AdminKelolaPage
            tab={kelolaTab}
            onTabChange={setKelolaTab}
            users={users}
            loadingMembers={loadingMembers}
          />
        )}
      </div>
    </div>
  );
}
