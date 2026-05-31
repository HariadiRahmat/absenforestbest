import React, { useEffect } from 'react';
import {
  QrCode,
  FileSpreadsheet,
  MapPin,
  Clock,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import { TabNav } from '../ui/TabNav';
import { QRGenerator } from '../QRGenerator';
import { GeofenceSettings } from '../GeofenceSettings';
import { AttendanceRecord, QRCodeConfig, UserProfile } from '../../types';

export type AdminAbsensiTab = 'qr_monitor' | 'rekap' | 'geofence';

interface AdminAbsensiPageProps {
  tab: AdminAbsensiTab;
  onTabChange: (tab: AdminAbsensiTab) => void;
  todayStr: string;
  activeQR: QRCodeConfig | null;
  loadingQR: boolean;
  attendanceToday: AttendanceRecord[];
  historicalAttendance: AttendanceRecord[];
  users: UserProfile[];
  totalScoutsCount: number;
  onRotateQR: () => Promise<void>;
  onEnableHistorical: () => void;
}

export function AdminAbsensiPage({
  tab,
  onTabChange,
  todayStr,
  activeQR,
  loadingQR,
  attendanceToday,
  historicalAttendance,
  users,
  totalScoutsCount,
  onRotateQR,
  onEnableHistorical,
}: AdminAbsensiPageProps) {
  useEffect(() => {
    if (tab === 'rekap') {
      onEnableHistorical();
    }
  }, [tab, onEnableHistorical]);

  const checkinsByDate: Record<string, number> = {};
  historicalAttendance.forEach((a) => {
    checkinsByDate[a.tanggal] = (checkinsByDate[a.tanggal] || 0) + 1;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="scout-card px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-bento-muted">
              Modul Absensi
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-bento-text mt-1">Kelola Absensi</h1>
            <p className="text-xs sm:text-sm text-bento-muted mt-1">
              QR code, monitor live, rekap, dan pengaturan GPS.
            </p>
          </div>
          <button
            type="button"
            onClick={onRotateQR}
            className="scout-btn-primary shrink-0 text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Rotate Token</span>
          </button>
        </div>
      </header>

      <TabNav
        tabs={[
          { id: 'admin-absensi-qr', key: 'qr_monitor', label: 'QR & Live', icon: QrCode },
          { id: 'admin-absensi-rekap', key: 'rekap', label: 'Rekap', icon: FileSpreadsheet },
          { id: 'admin-absensi-gps', key: 'geofence', label: 'GPS', icon: MapPin },
        ]}
        active={tab}
        onChange={onTabChange}
        columns={3}
      />

      {tab === 'qr_monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <QRGenerator
              token={activeQR?.token || null}
              dateStr={todayStr}
              onRotateToken={onRotateQR}
              loading={loadingQR}
              isActive={activeQR?.active || false}
            />
          </div>

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
                  const memberInfo = users.find((u) => u.userId === record.userId);
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

      {tab === 'rekap' && (
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
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 tracking-wider mb-3 uppercase">
                  Statistik Partisipasi harian
                </h4>
                <div className="space-y-3">
                  {Object.keys(checkinsByDate)
                    .sort()
                    .reverse()
                    .slice(0, 10)
                    .map((date) => {
                      const count = checkinsByDate[date];
                      const countPercentage =
                        totalScoutsCount > 0 ? Math.round((count / totalScoutsCount) * 100) : 0;
                      return (
                        <div key={date} className="p-4 bg-bento-soft border border-bento-border rounded-2xl">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs mb-1.5">
                            <span className="font-bold text-bento-text">{date}</span>
                            <span className="font-semibold text-bento-muted font-mono text-[11px] sm:text-xs">
                              {count} / {totalScoutsCount} ({countPercentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-bento-border h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-bento-primary h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, countPercentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-4 border-t border-bento-border">
                <h4 className="text-xs font-bold text-bento-text tracking-wider mb-3 uppercase">
                  Log Absensi Lengkap
                </h4>
                <div className="md:hidden space-y-2.5 max-h-[360px] overflow-y-auto">
                  {historicalAttendance.map((log) => (
                    <div key={log.id}>
                      <RekapLogCard log={log} />
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
                            {log.timestamp?.seconds
                              ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString('id-ID', {
                                  hour12: false,
                                })
                              : '--:--'}
                          </td>
                          <td className="p-3 text-center">
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {log.latitude ? (
                              <a
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

      {tab === 'geofence' && <GeofenceSettings />}
    </div>
  );
}

function RekapLogCard({ log }: { log: AttendanceRecord }) {
  return (
    <div className="scout-member-card">
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
          {log.timestamp?.seconds
            ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour12: false })
            : '--:--'}
        </span>
        {log.latitude ? (
          <a
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
  );
}
