import React from 'react';
import {
  Users,
  Shield,
  Award,
  CheckCircle,
  Clock,
  MapPin,
  ChevronRight,
  UserCheck,
  AlertCircle,
  Loader2,
  Mail,
} from 'lucide-react';
import {
  AttendanceRecord,
  PurnaApprovalStatus,
  PurnaRegistration,
  UserProfile,
  UserRole,
} from '../../types';

interface AdminOverviewPageProps {
  userName: string;
  users: UserProfile[];
  attendanceToday: AttendanceRecord[];
  purnaApplications: PurnaRegistration[];
  loadingPurna: boolean;
  onNavigateAbsensi: () => void;
  onNavigateKelolaPurna: () => void;
}

function formatHeaderDate() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function AdminOverviewPage({
  userName,
  users,
  attendanceToday,
  purnaApplications,
  loadingPurna,
  onNavigateAbsensi,
  onNavigateKelolaPurna,
}: AdminOverviewPageProps) {
  const totalAnggota = users.filter((u) => u.role === UserRole.ANGGOTA).length;
  const totalPembina = users.filter((u) => u.role === UserRole.ADMIN).length;
  const totalPurna = users.filter((u) => u.role === UserRole.PURNA).length;
  const totalUsers = users.length;

  const loggedToday = attendanceToday.length;
  const missingToday = Math.max(0, totalAnggota - loggedToday);
  const attendanceRate = totalAnggota > 0 ? Math.round((loggedToday / totalAnggota) * 100) : 0;

  const pendingPurna = purnaApplications.filter(
    (a) => a.approvalStatus === PurnaApprovalStatus.PENDING
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="scout-card px-4 py-4 sm:px-6 sm:py-5">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-bento-muted">
          Dashboard Utama
        </p>
        <h1 className="text-lg sm:text-2xl font-bold text-bento-text mt-1 leading-tight">
          Halo, {userName || 'Pembina'}
        </h1>
        <p className="text-xs sm:text-sm text-bento-muted mt-1">{formatHeaderDate()}</p>
      </header>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-bento-muted mb-2.5 px-0.5">
          Ringkasan Pengguna
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard
            label="Total Pengguna"
            value={totalUsers}
            icon={Users}
            iconClass="bg-bento-highlight text-bento-primary"
          />
          <StatCard
            label="Anggota"
            value={totalAnggota}
            icon={UserCheck}
            iconClass="bg-bento-accent text-bento-dark"
          />
          <StatCard
            label="Pembina"
            value={totalPembina}
            icon={Shield}
            iconClass="bg-bento-soft text-bento-muted"
          />
          <StatCard
            label="Purna"
            value={totalPurna}
            icon={Award}
            iconClass="bg-amber-50 text-amber-700"
          />
        </div>
      </section>

      <section className="scout-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="w-5 h-5 text-bento-primary shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-bento-text">Absensi Hari Ini</h2>
              <p className="text-[11px] sm:text-xs text-bento-muted mt-0.5">
                {loggedToday} hadir · {missingToday} belum absen · {attendanceRate}% kehadiran
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateAbsensi}
            className="scout-btn-secondary text-xs py-2 px-3 shrink-0"
          >
            Kelola
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <MiniStat label="Hadir" value={loggedToday} accent="text-lime-700 bg-lime-50 border-lime-100" />
          <MiniStat label="Belum" value={missingToday} accent="text-amber-800 bg-amber-50 border-amber-100" />
          <MiniStat label="Target" value={totalAnggota} accent="text-bento-text bg-bento-soft border-bento-border" />
        </div>

        {attendanceToday.length === 0 ? (
          <div className="text-center py-8 text-bento-muted text-xs border border-dashed border-bento-border rounded-2xl">
            <Clock className="w-8 h-8 stroke-1 mx-auto mb-2 opacity-40" />
            Belum ada check-in hari ini.
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {attendanceToday.slice(0, 8).map((record) => {
              const member = users.find((u) => u.userId === record.userId);
              const timeStr = record.timestamp?.seconds
                ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour12: false })
                : '--:--';
              return (
                <div key={record.id} className="scout-feed-item">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-bento-accent text-bento-dark flex items-center justify-center font-bold text-sm shrink-0">
                      {record.nama?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-bento-text truncate">{record.nama}</p>
                      <p className="text-[11px] text-bento-muted truncate">
                        Regu {member?.regu || '—'} · Kelas {member?.kelas || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-bento-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {timeStr}
                    </span>
                    {record.latitude ? (
                      <a
                        href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bento-primary font-semibold flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        GPS
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {attendanceToday.length > 8 && (
              <button
                type="button"
                onClick={onNavigateAbsensi}
                className="w-full text-xs font-semibold text-bento-primary py-2 hover:underline"
              >
                +{attendanceToday.length - 8} check-in lainnya
              </button>
            )}
          </div>
        )}
      </section>

      <section className="scout-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Award className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-bento-text">Validasi Purna</h2>
              <p className="text-[11px] sm:text-xs text-bento-muted mt-0.5">
                {pendingPurna.length > 0
                  ? `${pendingPurna.length} permintaan menunggu konfirmasi`
                  : 'Tidak ada permintaan pending'}
              </p>
            </div>
          </div>
          {pendingPurna.length > 0 && (
            <span className="scout-count-badge">{pendingPurna.length}</span>
          )}
        </div>

        {loadingPurna ? (
          <div className="text-center py-8 text-bento-muted text-sm">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Memuat permintaan...
          </div>
        ) : pendingPurna.length === 0 ? (
          <div className="text-center py-8 text-bento-muted text-xs border border-dashed border-bento-border rounded-2xl">
            <CheckCircle className="w-8 h-8 stroke-1 mx-auto mb-2 opacity-40" />
            Semua pendaftaran purna sudah ditinjau.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingPurna.slice(0, 5).map((app) => (
              <div key={app.email} className="scout-member-card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-bento-text truncate">{app.nama}</p>
                  <p className="text-[11px] text-bento-muted flex items-center gap-1 mt-0.5 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    {app.email}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100 shrink-0">
                  <AlertCircle className="w-3 h-3" />
                  Pending
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={onNavigateKelolaPurna}
              className="w-full scout-btn-primary text-xs py-2.5 mt-2"
            >
              Tinjau Semua Permintaan
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  iconClass: string;
}) {
  return (
    <div className="scout-card scout-stat-card sm:min-h-[100px]">
      <div className={`scout-stat-icon ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase text-bento-muted tracking-wide truncate">{label}</p>
        <h2 className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-bento-text leading-none">{value}</h2>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-center ${accent}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
